import { LayoutDashboard, Ship, Bell, Anchor, FileText, Activity, FileCheck, FileDown } from 'lucide-react';
import { Language } from '../App';
import { translations } from '../utils/translations';
import { UnifiedSidebar, MenuItem } from './layout/UnifiedSidebar';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  language: Language;
}

export function Sidebar({ currentPage, onNavigate, language }: SidebarProps) {
  const t = translations[language]?.agent || translations.en.agent;

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: t.menu.dashboard, icon: LayoutDashboard },
    { id: 'vessels', label: t.menu.myVessels, icon: Ship },
    { id: 'arrivals', label: t.menu.arrivalNotifications, icon: Bell },
    { id: 'anchorage', label: t.menu.anchorageRequests, icon: Anchor },
    { id: 'clearances', label: t.menu.portClearances, icon: FileCheck },
    { id: 'tracker', label: t.menu.requestStatusTracker, icon: Activity },
    { id: 'report', label: language === 'ar' ? 'تقرير نشاط السفينة' : 'Vessel Activity Report', icon: FileDown },
  ];

  return (
    <UnifiedSidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
      language={language}
      menuItems={menuItems}
      portalName={t.agentPortal}
      portalIcon={<Anchor className="w-6 h-6 text-white" />}
      userRoleName={language === 'ar' ? 'وكيل' : 'Agent User'}
      systemNameOverride={t.systemName}
    />
  );
}
