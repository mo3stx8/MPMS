import { ReactNode } from 'react';
import { useSidebar } from '../../contexts/SidebarContext';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  highlight?: boolean;
}

interface UnifiedSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  language: Language;
  menuItems: MenuItem[];
  portalName: string;
  portalIcon: ReactNode;
  userRoleName: string;
  systemStatusText?: string;
  systemNameOverride?: string;
}

export function UnifiedSidebar({
  currentPage,
  onNavigate,
  language,
  menuItems,
  portalName,
  portalIcon,
  userRoleName,
  systemStatusText,
  systemNameOverride,
}: UnifiedSidebarProps) {
  const { isExpanded, setExpanded } = useSidebar();
  const t = translations[language];
  const isRTL = language === 'ar';
  
  // Try to grab the system name from any available translation scope
  const systemName = systemNameOverride || 
    t?.agent?.systemName || 
    t?.executive?.systemName || 
    'Port System';

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setExpanded(false)}
      />
      <aside
        className={`fixed top-0 bottom-0 z-50 flex flex-col 
        ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}
        bg-blue-900 dark:bg-blue-950 border-blue-800 dark:border-blue-900 shadow-xl
        transition-all duration-300 ease-in-out
        ${isExpanded 
          ? 'w-64 translate-x-0' 
          : `w-64 lg:w-20 ${isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`} 
        overflow-x-hidden`}
      >
      {/* Logo Area */}
      <div className={`p-4 border-b border-blue-800 dark:border-blue-900 flex ${isExpanded ? 'items-center gap-3' : 'justify-center'} min-h-[5rem]`}>
        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center border border-white/20">
          <img src="/logo.png" alt={systemName} className="w-full h-full object-cover" />
        </div>
        {isExpanded && (
          <div className="overflow-hidden whitespace-nowrap">
            <h2 className="font-bold text-sm leading-tight text-white">{systemName}</h2>
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mt-0.5">{portalName}</p>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id} title={!isExpanded ? item.label : undefined}>
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    if (window.innerWidth < 1024) {
                      setExpanded(false);
                    }
                  }}
                  className={`flex items-center gap-3 py-3 rounded-lg transition-colors duration-200 relative
                    ${isExpanded ? 'w-full px-4' : 'w-12 h-12 justify-center mx-auto'} 
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && (
                    <span className="text-sm font-medium flex-1 text-start overflow-hidden whitespace-nowrap text-ellipsis">
                      {item.label}
                    </span>
                  )}
                  {isExpanded && item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                  )}
                  {isActive && !isExpanded && (
                    <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white ${isRTL ? 'left-0' : 'right-0'}`} />
                  )}
                  {isActive && isExpanded && !item.highlight && (
                    <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white ${isRTL ? 'left-2' : 'right-2'}`} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Info */}
      <div className={`p-4 border-t border-blue-800 dark:border-blue-900 ${isExpanded ? '' : 'flex flex-col items-center'}`}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
              <span className="text-blue-300 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {systemStatusText || (isRTL ? 'النظام نشط' : 'System Active')}
              </span>
            </div>
            <p className="text-xs text-blue-400 mt-1 px-2 whitespace-nowrap overflow-hidden text-ellipsis">{userRoleName}</p>
          </>
        ) : (
          <div className="w-2 h-2 bg-green-400 rounded-full" title={systemStatusText || (isRTL ? 'النظام نشط' : 'System Active')}></div>
        )}
      </div>
    </aside>
    </>
  );
}
