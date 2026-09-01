import React from 'react';
import { Language } from '../../App';
import { LayoutDashboard, Anchor, Package, BoxSelect, BarChart3, History } from 'lucide-react';
import { UnifiedSidebar, MenuItem } from '../layout/UnifiedSidebar';

interface WharfSidebarProps {
  language: Language;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function WharfSidebar({ language, currentPage, onNavigate }: WharfSidebarProps) {
  const isRTL = language === 'ar';

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: isRTL ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'availability', label: isRTL ? 'توفر الأرصفة' : 'Wharf Availability', icon: Anchor },
    { id: 'storage', label: isRTL ? 'إدارة التخزين' : 'Storage Management', icon: Package },
    { id: 'discharge', label: isRTL ? 'طلبات التفريغ' : 'Discharge Requests', icon: BoxSelect },
    { id: 'capacity', label: isRTL ? 'نظرة عامة على السعة' : 'Capacity Overview', icon: BarChart3 },
    { id: 'vessel-history', label: isRTL ? 'سجل السفن' : 'Vessel History', icon: History }
  ];

  return (
    <UnifiedSidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
      language={language}
      menuItems={menuItems}
      portalName={isRTL ? 'إدارة الأرصفة والتخزين' : 'Wharf & Storage Operations'}
      portalIcon={<Package className="w-6 h-6 text-white" />}
      userRoleName={isRTL ? 'موظف الأرصفة والتخزين' : 'Wharf & Storage Officer'}
      systemStatusText={isRTL ? 'جميع الأنظمة تعمل' : 'All systems operational'}
    />
  );
}
