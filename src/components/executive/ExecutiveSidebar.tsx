import { LayoutDashboard, Ship, Anchor, FileText, BarChart3, Users, ShieldCheck, History } from 'lucide-react';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { UnifiedSidebar, MenuItem } from '../layout/UnifiedSidebar';

interface ExecutiveSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  language: Language;
}

export function ExecutiveSidebar({ currentPage, onNavigate, language }: ExecutiveSidebarProps) {
  const t = translations[language]?.executive || translations.en.executive;
  const isRTL = language === 'ar';

  const menuItems: MenuItem[] = [
    { id: 'dashboard',      label: t.menu.dashboard,         icon: LayoutDashboard },
    { id: 'arrivals',       label: t.menu.arrivalApprovals,  icon: Ship },
    { id: 'anchorage',      label: t.menu.anchorageApprovals, icon: Anchor },
    { id: 'user-approvals', label: t.menu.userApprovals,     icon: Users, highlight: true },
    { id: 'user-directory', label: t.menu.userDirectory,     icon: ShieldCheck },
    { id: 'logs',           label: t.menu.decisionLogs,      icon: FileText },
    { id: 'reports',        label: t.menu.reportsAnalytics,  icon: BarChart3 },
    { id: 'emergency-exits', label: t.menu.emergencyExits,   icon: ShieldCheck },
    { id: 'vessel-history', label: language === 'ar' ? 'سجل السفن' : 'Vessel History', icon: History },
  ];

  return (
    <UnifiedSidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
      language={language}
      menuItems={menuItems}
      portalName={t.executivePortal}
      portalIcon={<BarChart3 className="w-6 h-6 text-white" />}
      userRoleName={isRTL ? 'إدارة تنفيذية' : 'Executive Management'}
      systemNameOverride={t.systemName}
    />
  );
}
