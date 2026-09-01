import React from 'react';
import { Language } from '../../App';
import { LayoutDashboard, Package, FileText, Bell } from 'lucide-react';
import { UnifiedSidebar, MenuItem } from '../layout/UnifiedSidebar';

interface TraderSidebarProps {
  language: Language;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function TraderSidebar({ language, currentPage, onNavigate }: TraderSidebarProps) {
  const isRTL = language === 'ar';

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: isRTL ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'containers', label: isRTL ? 'حاوياتي' : 'My Containers', icon: Package },
    { id: 'discharge', label: isRTL ? 'طلبات التفريغ' : 'Discharge Requests', icon: FileText },
    { id: 'notifications', label: isRTL ? 'الإشعارات' : 'Notifications', icon: Bell }
  ];

  return (
    <UnifiedSidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
      language={language}
      menuItems={menuItems}
      portalName={isRTL ? 'بوابة التاجر' : 'Trader Portal'}
      portalIcon={<Package className="w-6 h-6 text-white" />}
      userRoleName={isRTL ? 'التاجر المعتمد' : 'Trader'}
      systemStatusText={isRTL ? 'جميع الأنظمة تعمل' : 'All systems operational'}
    />
  );
}
