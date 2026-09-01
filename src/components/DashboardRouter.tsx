import { useState, useEffect } from 'react';
import { AlertCircle, LogOut, Shield, Ship, Package, BarChart3, Anchor, Bell, Globe, User as UserIcon, ChevronDown, Settings, Sun, Moon, Search, Clock } from 'lucide-react';
import { User, Language } from '../App';
import { translations } from '../utils/translations';
import { MainLayout } from './MainLayout';
import { useSidebar } from '../contexts/SidebarContext';
import { Menu } from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { SearchAutocomplete } from './SearchAutocomplete';
import { AgentDashboard } from './agent/AgentDashboard';
import { MyVessels } from './agent/MyVessels';
import { ArrivalNotifications } from './agent/ArrivalNotifications';
import { AnchorageRequests } from './agent/AnchorageRequests';
import { RequestStatusTracker } from './agent/RequestStatusTracker';
import { PortClearances as AgentPortClearances } from './agent/PortClearances';
import { VesselActivityReport } from './agent/VesselActivityReport';
import { ExecutiveSidebar } from './executive/ExecutiveSidebar';
import { ExecutiveDashboard } from './executive/ExecutiveDashboard';
import { ArrivalApprovals } from './executive/ArrivalApprovals';
import { AnchorageApprovals } from './executive/AnchorageApprovals';
import { DecisionLogs } from './executive/DecisionLogs';
import { ReportsAnalytics } from './executive/ReportsAnalytics';
import { EmergencyExits } from './executive/EmergencyExits';
import { UserApprovals } from './executive/UserApprovals';
import { UserDirectory } from './executive/UserDirectory';
import { VesselHistory as ExecutiveVesselHistory } from './executive/VesselHistory';
import { VesselHistory as OfficerVesselHistory } from './portofficer/VesselHistory';
import { VesselHistory as WharfVesselHistory } from './wharf/VesselHistory';
import { PortOfficerSidebar } from './portofficer/PortOfficerSidebar';
import { PortOfficerDashboard } from './portofficer/PortOfficerDashboard';
import { ActiveVessels } from './portofficer/ActiveVessels';
import { PortClearances } from './portofficer/PortClearances';
import { OperationalLogs } from './portofficer/OperationalLogs';
import { PortReport } from './portofficer/PortReport';
import { WharfSidebar } from './wharf/WharfSidebar';
import { WharfDashboard } from './wharf/WharfDashboard';
import { WharfAvailability } from './wharf/WharfAvailability';
import { StorageManagement } from './wharf/StorageManagement';
import { WharfDischargeRequests } from './wharf/WharfDischargeRequests';
import { CapacityOverview } from './wharf/CapacityOverview';
import { TraderSidebar } from './trader/TraderSidebar';
import { TraderDashboard } from './trader/TraderDashboard';
import { MyContainers } from './trader/MyContainers';
import { DischargeRequests } from './trader/DischargeRequests';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationsPage } from './NotificationsPage';
import { useNotifications, NotificationItem } from '../hooks/useNotifications';
import { agentService } from '../services/agentService';
import api from '../services/api';
import { toast } from 'react-toastify';
interface DashboardRouterProps {
  user: User;
  language: Language;
  onLogout: () => void;
  onToggleLanguage: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// All valid page keys per role — used to guard against stale ?tab= values on refresh
const VALID_PAGES: Record<string, string[]> = {
  executive: ['dashboard', 'notifications', 'arrivals', 'vessel-history', 'anchorage', 'user-approvals', 'user-directory', 'logs', 'reports', 'emergency-exits', 'settings'],
  officer:   ['dashboard', 'notifications', 'vessels', 'clearances', 'logs', 'report', 'vessel-history', 'settings'],
  wharf:     ['dashboard', 'notifications', 'availability', 'storage', 'discharge', 'capacity', 'vessel-history', 'settings'],
  trader:    ['dashboard', 'notifications', 'containers', 'discharge', 'settings'],
  agent:     ['dashboard', 'notifications', 'vessels', 'arrivals', 'anchorage', 'clearances', 'tracker', 'report', 'settings'],
};

export function DashboardRouter({ user, language, onLogout, onToggleLanguage, theme, onToggleTheme }: DashboardRouterProps) {
  const t = translations[language]?.dashboard || translations.en.dashboard;
  const isRTL = language === 'ar';
  const hasSignature = !!user.signature;

  // Persist signature and name for PDF exports without prop drilling
  useEffect(() => {
    if (user.signature) {
      localStorage.setItem('user_signature', user.signature);
    } else {
      localStorage.removeItem('user_signature');
    }
    if (user.name) {
      localStorage.setItem('user_name', user.name);
    } else {
      localStorage.removeItem('user_name');
    }
  }, [user.signature, user.name]);

  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'dashboard';
    // Guard: if the saved tab is unknown for this role, fall back to 'dashboard'
    const validPages = VALID_PAGES[user.role] ?? [];
    return validPages.includes(tab) ? tab : 'dashboard';
  });

  const [activeVesselId, setActiveVesselId] = useState<string | number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('vesselId');
  });

  const { isExpanded, toggleSidebar } = useSidebar();

  const handleNavigate = (page: string, params?: { vesselId?: number | string }) => {
    if (params?.vesselId) {
      setActiveVesselId(params.vesselId);
    }
    setCurrentPage(page);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    
    // Tab Sync
    if (currentPage === 'dashboard') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', currentPage);
    }

    // Vessel ID Sync
    if (currentPage === 'vessel-history' && activeVesselId) {
      url.searchParams.set('vesselId', activeVesselId.toString());
    } else {
      url.searchParams.delete('vesselId');
    }

    window.history.replaceState({}, '', url);
  }, [currentPage, activeVesselId]);

  // Timeout Resolution Logic for Agents
  const { data: notifications = [] } = useNotifications(user.role === 'agent' ? user : null);
  const [activeTimeout, setActiveTimeout] = useState<NotificationItem | null>(null);
  const [dismissedTimeouts, setDismissedTimeouts] = useState<(string | number)[]>([]);

  useEffect(() => {
    if (user.role === 'agent') {
      const timeoutNotif = notifications.find(n => n.type === 'anchorage_timeout' && n.status === 'unread' && !dismissedTimeouts.includes(n.id));
      if (timeoutNotif && !activeTimeout) {
        setActiveTimeout(timeoutNotif);
      }
    }
  }, [notifications, user.role, activeTimeout, dismissedTimeouts]);

  const [expandHours, setExpandHours] = useState<number | ''>('');

  const handleExpand = async () => {
    if (!activeTimeout?.data?.request_id || !expandHours || Number(expandHours) < 1) return;
    try {
      await agentService.expandDuration(activeTimeout.data.request_id, Number(expandHours));
      // Mark notification as read so it doesn't pop up again
      await api.post(`/notifications/${activeTimeout.operationId}/read`);
      setDismissedTimeouts(prev => [...prev, activeTimeout.id]);
      setActiveTimeout(null);
      setExpandHours('');
      toast.success(isRTL ? 'تم تمديد الفترة بنجاح' : 'Duration expanded successfully');
    } catch (error) {
      toast.error('Error expanding duration');
    }
  };

  const handleClearance = () => {
    if (!activeTimeout) return;
    // Mark as read locally to prevent reappearing
    setDismissedTimeouts(prev => [...prev, activeTimeout.id]);
    // Close modal immediately, then navigate — no async delay
    setActiveTimeout(null);
    setCurrentPage('clearances');
    // Mark as read in the background (fire-and-forget)
    api.post(`/notifications/${activeTimeout.operationId}/read`).catch(() => {});
  };

  // Executive Management Interface
  if (user.role === 'executive') {
    return (
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[var(--bg-primary)] transition-colors duration-300`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Background Decor */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>
        </div>

        {/* Sidebar */}
        <ExecutiveSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          language={language}
        />

        {/* Main Content Area */}
        <div className={`${language === 'ar' ? (isExpanded ? 'mr-64' : 'mr-20') : (isExpanded ? 'ml-64' : 'ml-20')} min-h-screen transition-all duration-300 ease-in-out`}>
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-secondary shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <SearchAutocomplete user={user} language={language} onNavigate={handleNavigate} />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Language Toggle */}
                <button
                  onClick={onToggleLanguage}
                  className="flex items-center gap-1 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">{language === 'ar' ? 'EN' : 'ع'}</span>
                </button>

                {/* Notifications */}
                <NotificationDropdown user={user} language={language} onNavigate={handleNavigate} />

                {/* Profile Actions */}
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors" onClick={() => setCurrentPage('settings')}>{t.account}</span>
                  
                  {/* Mobile avatar link to settings */}
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-8 h-8 lg:hidden bg-primary/10 rounded-lg flex items-center justify-center"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                  </button>

                  <button 
                    onClick={onLogout} 
                    className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 relative">
            {!hasSignature && currentPage !== 'settings' && (
              <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl m-6">
                <div className="bg-[var(--bg-card)] border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center animate-in zoom-in-95 duration-300">
                  <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {language === 'ar' ? 'تفعيل الحساب مطلوب' : 'Account Activation Required'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-6">
                    {language === 'ar'
                      ? 'لإكمال تفعيل حسابك واستخدام النظام، يرجى إضافة توقيعك الرقمي من إعدادات الحساب.'
                      : 'To activate your account and use the system, please add your digital signature in Account Settings.'}
                  </p>
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'الانتقال للإعدادات' : 'Go to Settings'}
                  </button>
                </div>
              </div>
            )}
            {currentPage === 'dashboard' && <ExecutiveDashboard language={language} onNavigate={handleNavigate} />}
            {currentPage === 'notifications' && <NotificationsPage user={user} language={language} />}
            {currentPage === 'arrivals' && <ArrivalApprovals language={language} onNavigate={handleNavigate} />}
            {currentPage === 'vessel-history' && (
              <ExecutiveVesselHistory 
                language={language} 
                vesselId={activeVesselId || ''} 
                onNavigate={handleNavigate} 
              />
            )}
            {currentPage === 'anchorage' && <AnchorageApprovals language={language} onNavigate={handleNavigate} />}
            {currentPage === 'user-approvals' && <UserApprovals language={language} />}
            {currentPage === 'user-directory' && <UserDirectory language={language} />}
            {currentPage === 'logs' && <DecisionLogs language={language} />}
            {currentPage === 'reports' && <ReportsAnalytics language={language} />}
            {currentPage === 'emergency-exits' && <EmergencyExits language={language} onNavigate={handleNavigate} />}
            {currentPage === 'settings' && (
              <AccountSettings 
                user={user} 
                language={language} 
                theme={theme} 
                onToggleTheme={onToggleTheme} 
                onToggleLanguage={onToggleLanguage} 
              />
            )}
            {/* Catch-all: unknown page → show dashboard */}
            {!VALID_PAGES.executive.includes(currentPage) && <ExecutiveDashboard language={language} onNavigate={handleNavigate} />}
          </main>
        </div>
      </div>
    );
  }

  // Port Officer Interface
  if (user.role === 'officer') {
    return (
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[var(--bg-primary)] transition-colors duration-300`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Background Decor */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>
        </div>

        {/* Sidebar */}
        <PortOfficerSidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          language={language}
        />

        {/* Main Content Area */}
        <div className={`${language === 'ar' ? (isExpanded ? 'mr-64' : 'mr-20') : (isExpanded ? 'ml-64' : 'ml-20')} min-h-screen transition-all duration-300 ease-in-out`}>
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-secondary shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <SearchAutocomplete user={user} language={language} onNavigate={handleNavigate} />
                <h2 className="text-[var(--text-primary)] font-semibold text-lg">
                  {currentPage === 'dashboard' && (isRTL ? 'لوحة التحكم' : 'Dashboard')}
                  {currentPage === 'berthing' && (isRTL ? 'إدارة الرسو' : 'Berthing Management')}
                  {currentPage === 'vessels' && (isRTL ? 'السفن النشطة' : 'Active Vessels')}
                  {currentPage === 'clearances' && (isRTL ? 'تصاريح المغادرة' : 'Port Clearances')}
                  {currentPage === 'logs' && (isRTL ? 'السجلات التشغيلية' : 'Operational Logs')}
                  {currentPage === 'report' && (isRTL ? 'تقرير التنظيمي' : 'Regulatory Report')}
                  {currentPage === 'vessel-history' && (isRTL ? 'سجل السفن' : 'Vessel History')}
                </h2>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Language Toggle */}
                <button
                  onClick={onToggleLanguage}
                  className="flex items-center gap-1 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">{language === 'ar' ? 'EN' : 'ع'}</span>
                </button>

                {/* Notifications */}
                <NotificationDropdown user={user} language={language} onNavigate={setCurrentPage} />

                {/* Profile Actions */}
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors" onClick={() => setCurrentPage('settings')}>{t.account}</span>
                  
                  {/* Mobile avatar link to settings */}
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-8 h-8 lg:hidden bg-primary/10 rounded-lg flex items-center justify-center"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                  </button>

                  <button 
                    onClick={onLogout} 
                    className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 relative">
            {!hasSignature && currentPage !== 'settings' && (
              <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl m-6">
                <div className="bg-[var(--bg-card)] border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center animate-in zoom-in-95 duration-300">
                  <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {language === 'ar' ? 'تفعيل الحساب مطلوب' : 'Account Activation Required'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-6">
                    {language === 'ar'
                      ? 'لإكمال تفعيل حسابك واستخدام النظام، يرجى إضافة توقيعك الرقمي من إعدادات الحساب.'
                      : 'To activate your account and use the system, please add your digital signature in Account Settings.'}
                  </p>
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'الانتقال للإعدادات' : 'Go to Settings'}
                  </button>
                </div>
              </div>
            )}
            {currentPage === 'dashboard' && <PortOfficerDashboard language={language} />}
            {currentPage === 'notifications' && <NotificationsPage user={user} language={language} />}
            {currentPage === 'vessels' && <ActiveVessels language={language} onNavigate={setCurrentPage} />}
            {currentPage === 'clearances' && <PortClearances language={language} />}
            {currentPage === 'logs' && <OperationalLogs language={language} />}
            {currentPage === 'report' && <PortReport language={language} />}
            {currentPage === 'vessel-history' && (
              <OfficerVesselHistory 
                language={language} 
                vesselId={activeVesselId || ''} 
                onNavigate={setCurrentPage} 
              />
            )}
            {currentPage === 'settings' && (
              <AccountSettings 
                user={user} 
                language={language} 
                theme={theme} 
                onToggleTheme={onToggleTheme} 
                onToggleLanguage={onToggleLanguage} 
              />
            )}
            {/* Catch-all: unknown page → show dashboard */}
            {!VALID_PAGES.officer.includes(currentPage) && <PortOfficerDashboard language={language} />}
          </main>
        </div>
      </div>
    );
  }

  // Wharf & Storage Officer Interface
  if (user.role === 'wharf') {
    const t = translations[language].dashboard;
    const isRTL = language === 'ar';

    return (
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[var(--bg-primary)] transition-colors duration-300`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Background Decor */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>
        </div>

        {/* Sidebar */}
        <WharfSidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          language={language}
        />

        {/* Main Content Area */}
        <div className={`${language === 'ar' ? (isExpanded ? 'lg:mr-64' : 'lg:mr-20') : (isExpanded ? 'lg:ml-64' : 'lg:ml-20')} min-h-screen transition-all duration-300 ease-in-out`}>
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-secondary shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <SearchAutocomplete user={user} language={language} onNavigate={handleNavigate} />
                <h2 className="text-[var(--text-primary)] font-semibold text-lg">
                  {currentPage === 'dashboard' && (isRTL ? 'لوحة التحكم' : 'Dashboard')}
                  {currentPage === 'availability' && (isRTL ? 'توفر الأرصفة' : 'Wharf Availability')}
                  {currentPage === 'storage' && (isRTL ? 'إدارة التخزين' : 'Storage Management')}
                  {currentPage === 'discharge' && (isRTL ? 'طلبات التفريغ' : 'Discharge Requests')}
                  {currentPage === 'capacity' && (isRTL ? 'نظرة عامة على السعة' : 'Capacity Overview')}
                  {currentPage === 'vessel-history' && (isRTL ? 'سجل السفن' : 'Vessel History')}
                </h2>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Language Toggle */}
                <button
                  onClick={onToggleLanguage}
                  className="flex items-center gap-1 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">{language === 'ar' ? 'EN' : 'ع'}</span>
                </button>

                {/* Notifications */}
                <NotificationDropdown user={user} language={language} onNavigate={setCurrentPage} />

                {/* Profile Actions */}
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors" onClick={() => setCurrentPage('settings')}>{t.account}</span>
                  
                  {/* Mobile avatar link to settings */}
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-8 h-8 lg:hidden bg-primary/10 rounded-lg flex items-center justify-center"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                  </button>

                  <button 
                    onClick={onLogout} 
                    className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 relative">
            {!hasSignature && currentPage !== 'settings' && (
              <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl m-6">
                <div className="bg-[var(--bg-card)] border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center animate-in zoom-in-95 duration-300">
                  <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {language === 'ar' ? 'تفعيل الحساب مطلوب' : 'Account Activation Required'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-6">
                    {language === 'ar'
                      ? 'لإكمال تفعيل حسابك واستخدام النظام، يرجى إضافة توقيعك الرقمي من إعدادات الحساب.'
                      : 'To activate your account and use the system, please add your digital signature in Account Settings.'}
                  </p>
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'الانتقال للإعدادات' : 'Go to Settings'}
                  </button>
                </div>
              </div>
            )}
            {currentPage === 'dashboard' && <WharfDashboard user={user} language={language} />}
            {currentPage === 'notifications' && <NotificationsPage user={user} language={language} />}
            {currentPage === 'availability' && <WharfAvailability user={user} language={language} />}
            {currentPage === 'storage' && <StorageManagement language={language} />}
            {currentPage === 'discharge' && <WharfDischargeRequests user={user} language={language} />}
            {currentPage === 'capacity' && <CapacityOverview language={language} />}
            {currentPage === 'vessel-history' && (
              <WharfVesselHistory 
                language={language} 
                vesselId={activeVesselId || ''} 
                onNavigate={setCurrentPage} 
              />
            )}
            {currentPage === 'settings' && (
              <AccountSettings 
                user={user} 
                language={language} 
                theme={theme} 
                onToggleTheme={onToggleTheme} 
                onToggleLanguage={onToggleLanguage} 
              />
            )}
            {/* Catch-all: unknown page → show dashboard */}
            {!VALID_PAGES.wharf.includes(currentPage) && <WharfDashboard user={user} language={language} />}
          </main>
        </div>
      </div>
    );
  }

  // Trader Interface
  if (user.role === 'trader') {
    const t = translations[language].dashboard;
    const isRTL = language === 'ar';

    return (
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[var(--bg-primary)] transition-colors duration-300`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Background Decor */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>
        </div>

        {/* Sidebar */}
        <TraderSidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          language={language}
        />

        {/* Main Content Area */}
        <div className={`${language === 'ar' ? (isExpanded ? 'mr-64' : 'mr-20') : (isExpanded ? 'ml-64' : 'ml-20')} min-h-screen transition-all duration-300 ease-in-out`}>
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-secondary shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <SearchAutocomplete user={user} language={language} onNavigate={handleNavigate} />
                <h2 className="text-[var(--text-primary)] font-semibold text-lg">
                  {currentPage === 'dashboard' && (isRTL ? 'لوحة التحكم' : 'Dashboard')}
                  {currentPage === 'containers' && (isRTL ? 'حاوياتي' : 'My Containers')}
                  {currentPage === 'discharge' && (isRTL ? 'طلبات التفريغ' : 'Discharge Requests')}
                  {currentPage === 'notifications' && (isRTL ? 'الإشعارات' : 'Notifications')}
                </h2>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Language Toggle */}
                <button
                  onClick={onToggleLanguage}
                  className="flex items-center gap-1 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">{language === 'ar' ? 'EN' : 'ع'}</span>
                </button>

                {/* Notifications */}
                <NotificationDropdown user={user} language={language} onNavigate={setCurrentPage} />

                {/* Profile Actions */}
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors" onClick={() => setCurrentPage('settings')}>{t.account}</span>
                  
                  {/* Mobile avatar link to settings */}
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-8 h-8 lg:hidden bg-primary/10 rounded-lg flex items-center justify-center"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                  </button>

                  <button 
                    onClick={onLogout} 
                    className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 relative">
            {!hasSignature && currentPage !== 'settings' && (
              <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl m-6">
                <div className="bg-[var(--bg-card)] border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center animate-in zoom-in-95 duration-300">
                  <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {language === 'ar' ? 'تفعيل الحساب مطلوب' : 'Account Activation Required'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-6">
                    {language === 'ar'
                      ? 'لإكمال تفعيل حسابك واستخدام النظام، يرجى إضافة توقيعك الرقمي من إعدادات الحساب.'
                      : 'To activate your account and use the system, please add your digital signature in Account Settings.'}
                  </p>
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'الانتقال للإعدادات' : 'Go to Settings'}
                  </button>
                </div>
              </div>
            )}
            {currentPage === 'dashboard' && <TraderDashboard language={language} userEmail={user.email} onNavigate={setCurrentPage} />}
            {currentPage === 'notifications' && <NotificationsPage user={user} language={language} />}
            {currentPage === 'containers' && <MyContainers language={language} userEmail={user.email} />}
            {currentPage === 'discharge' && <DischargeRequests language={language} userEmail={user.email} userName={user.name} />}
            {currentPage === 'settings' && (
              <AccountSettings 
                user={user} 
                language={language} 
                theme={theme} 
                onToggleTheme={onToggleTheme} 
                onToggleLanguage={onToggleLanguage} 
              />
            )}
            {/* Catch-all: unknown page → show dashboard */}
            {!VALID_PAGES.trader.includes(currentPage) && <TraderDashboard language={language} userEmail={user.email} onNavigate={setCurrentPage} />}
          </main>
        </div>
      </div>
    );
  }

  // If user is an agent, show the full agent interface
  if (user.role === 'agent') {
    return (
      <MainLayout
        user={user}
        language={language}
        onToggleLanguage={onToggleLanguage}
        onLogout={onLogout}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        theme={theme}
        onToggleTheme={onToggleTheme}
      >
        <div className="relative min-h-screen">
          {!hasSignature && currentPage !== 'settings' && (
            <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl m-6">
              <div className="bg-[var(--bg-card)] border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center animate-in zoom-in-95 duration-300">
                <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  {language === 'ar' ? 'تفعيل الحساب مطلوب' : 'Account Activation Required'}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6">
                  {language === 'ar'
                    ? 'لإكمال تفعيل حسابك واستخدام النظام، يرجى إضافة توقيعك الرقمي من إعدادات الحساب.'
                    : 'To activate your account and use the system, please add your digital signature in Account Settings.'}
                </p>
                <button 
                  onClick={() => setCurrentPage('settings')}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                >
                  {language === 'ar' ? 'الانتقال للإعدادات' : 'Go to Settings'}
                </button>
              </div>
            </div>
          )}
          {currentPage === 'dashboard' && <AgentDashboard language={language} onNavigate={setCurrentPage} />}
        {currentPage === 'notifications' && <NotificationsPage user={user} language={language} />}
        {currentPage === 'vessels' && <MyVessels language={language} onNavigate={setCurrentPage} />}
        {currentPage === 'arrivals' && <ArrivalNotifications language={language} />}
        {currentPage === 'anchorage' && <AnchorageRequests language={language} />}
        {currentPage === 'clearances' && <AgentPortClearances language={language} />}
        {currentPage === 'tracker' && <RequestStatusTracker language={language} onNavigate={setCurrentPage} userId={user.id} />}
        {currentPage === 'report' && <VesselActivityReport language={language} vesselId={activeVesselId} />}
        {currentPage === 'settings' && (
          <AccountSettings 
            user={user} 
            language={language} 
            theme={theme} 
            onToggleTheme={onToggleTheme} 
            onToggleLanguage={onToggleLanguage} 
          />
        )}
        {/* Catch-all: unknown page → show dashboard */}
        {!VALID_PAGES.agent.includes(currentPage) && <AgentDashboard language={language} onNavigate={setCurrentPage} />}
        
        {/* Timeout Resolution Modal */}
        {activeTimeout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                      {isRTL ? 'تنبيه: انتهاء فترة الرسو' : 'URGENT: Anchorage Timeout'}
                    </h2>
                    <p className="text-red-500 text-sm font-bold tracking-widest uppercase opacity-80">
                      {activeTimeout.data?.vessel_name}
                    </p>
                  </div>
                </div>

                <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
                  {isRTL 
                    ? 'لقد انتهت فترة الرسو المحددة لهذه السفينة. يرجى اتخاذ إجراء فوري لتجنب الغرامات أو الإخلاء القسري.' 
                    : 'The allocated anchorage duration for this vessel has expired. Please resolve this immediately by expanding the duration or initiating port clearance.'}
                </p>

                <div className="grid grid-cols-1 gap-4">
                  {/* Custom Duration Expand */}
                  <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary hover:border-primary transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-[var(--text-primary)] font-bold">
                          {isRTL ? 'تمديد مخصص' : 'Custom Duration Expand'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {isRTL ? 'أدخل عدد الساعات الإضافية' : 'Enter the number of additional hours'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder={isRTL ? 'عدد الساعات...' : 'Hours...'}
                        value={expandHours}
                        onChange={(e) => setExpandHours(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-secondary rounded-xl text-[var(--text-primary)] text-sm outline-none focus:border-primary transition-colors"
                      />
                      <button
                        onClick={handleExpand}
                        disabled={!expandHours || Number(expandHours) < 1}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold rounded-xl text-sm transition-colors"
                      >
                        {isRTL ? 'تمديد' : 'Expand'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer" onClick={handleClearance}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Ship className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-primary font-bold">{isRTL ? 'طلب تصريح مغادرة' : 'Request Port Clearance'}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{isRTL ? 'إنهاء الرسو والمغادرة' : 'End session and initiate departure'}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-primary ${isRTL ? 'rotate-90' : '-rotate-90'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

      </MainLayout>
    );
  }

  // For other roles, show basic dashboard (placeholder)
  const getRoleIcon = () => {
    switch (user.role) {
      case 'executive':
        return <BarChart3 className="w-8 h-8" />;
      case 'officer':
        return <Shield className="w-8 h-8" />;
      case 'trader':
        return <Package className="w-8 h-8" />;
      case 'wharf':
        return <Anchor className="w-8 h-8" />;
      default:
        return <Ship className="w-8 h-8" />;
    }
  };

  const getRoleDashboardTitle = () => {
    switch (user.role) {
      case 'executive':
        return t.roles.executive;
      case 'officer':
        return t.roles.officer;
      case 'trader':
        return t.roles.trader;
      case 'wharf':
        return t.roles.wharf;
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Navigation Bar */}
      <nav className="bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-[var(--text-primary)] font-semibold">{getRoleDashboardTitle()}</h1>
                <p className="text-[var(--text-secondary)] text-xs">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="hidden lg:flex items-center gap-1 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{t.logout}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentPage === 'settings' ? (
          <AccountSettings 
            user={user} 
            language={language} 
            theme={theme} 
            onToggleTheme={onToggleTheme} 
            onToggleLanguage={onToggleLanguage} 
          />
        ) : (
          <>
            {/* Verification Warning Banner */}
            {!user.verified && (
              <div className="mb-8 bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-semibold mb-1">{t.pendingVerification}</h3>
                    <p className="text-amber-500/80 text-sm">{t.verificationMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-primary)] rounded-2xl border border-secondary/50 shadow-xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="text-center relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-accent text-white rounded-2xl mb-6 shadow-lg shadow-primary/20">
                  {getRoleIcon()}
                </div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {t.welcome}, {user.name}
                </h2>
                <p className="text-[var(--text-secondary)] mb-8">{getRoleDashboardTitle()}</p>

                {/* Role-specific Dashboard Content */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm border border-secondary/50 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="text-[var(--text-secondary)] text-sm mb-2">Status</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${user.verified
                      ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${user.verified ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
                      <span className="text-sm font-medium">{user.verified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm border border-secondary/50 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="text-[var(--text-secondary)] text-sm mb-2">Role</div>
                    <div className="text-[var(--text-primary)] font-semibold capitalize">{(user.role as string).replace('_', ' ')}</div>
                  </div>

                  <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm border border-secondary/50 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="text-[var(--text-secondary)] text-sm mb-2">Access Level</div>
                    <div className="text-[var(--text-primary)] font-semibold">{user.verified ? 'Full Access' : 'Limited'}</div>
                  </div>
                </div>

                {/* Mock Dashboard Content */}
                <div className="mt-12 text-left">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Quick Actions</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button className="group bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border-l-4 border-primary rounded-r-xl p-6 text-left shadow-sm hover:shadow-md transition-all transform hover:scale-[1.01]">
                      <h4 className="text-[var(--text-primary)] font-semibold mb-2 group-hover:text-primary transition-colors">View Reports</h4>
                      <p className="text-[var(--text-secondary)] text-sm">Access system reports and analytics</p>
                    </button>

                    <button className="group bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border-l-4 border-accent rounded-r-xl p-6 text-left shadow-sm hover:shadow-md transition-all transform hover:scale-[1.01]">
                      <h4 className="text-[var(--text-primary)] font-semibold mb-2 group-hover:text-accent transition-colors">Manage Operations</h4>
                      <p className="text-[var(--text-secondary)] text-sm">Handle daily operations and tasks</p>
                    </button>

                    <button className="group bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border-l-4 border-amber-500 rounded-r-xl p-6 text-left shadow-sm hover:shadow-md transition-all transform hover:scale-[1.01]" disabled={!user.verified}>
                      <h4 className="text-[var(--text-primary)] font-semibold mb-2 group-hover:text-amber-500 transition-colors">Submit Requests</h4>
                      <p className="text-[var(--text-secondary)] text-sm">Create new operational requests</p>
                      {!user.verified && (
                        <span className="inline-block mt-2 text-xs text-amber-500">⚠️ Requires verification</span>
                      )}
                    </button>

                    <button 
                      onClick={() => setCurrentPage('settings')}
                      className="group bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border-l-4 border-secondary rounded-r-xl p-6 text-left shadow-sm hover:shadow-md transition-all transform hover:scale-[1.01]"
                    >
                      <h4 className="text-[var(--text-primary)] font-semibold mb-2 group-hover:text-[var(--text-primary)] transition-colors">Settings</h4>
                      <p className="text-[var(--text-secondary)] text-sm">Manage your account settings</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
