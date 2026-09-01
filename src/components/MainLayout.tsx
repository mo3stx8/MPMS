import { useState } from 'react';
import { Bell, LogOut, User as UserIcon, ChevronDown, Globe, Settings, Sun, Moon, Menu, Search } from 'lucide-react';
import { User, Language } from '../App';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Sidebar } from './Sidebar';
import { useSidebar } from '../contexts/SidebarContext';
import { translations } from '../utils/translations';
import { NotificationDropdown } from './NotificationDropdown';

interface MainLayoutProps {
  user: User;
  language: Language;
  onToggleLanguage: () => void;
  onLogout: () => void;
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function MainLayout({
  user,
  language,
  onToggleLanguage,
  onLogout,
  children,
  currentPage,
  onNavigate,
  theme,
  onToggleTheme
}: MainLayoutProps) {
  const t = translations[language]?.agent || translations.en.agent;
  const { isExpanded, toggleSidebar } = useSidebar();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[var(--background)] transition-colors duration-300`} dir={language === 'ar' ? 'rtl' : 'ltr'}>


      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
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
              <SearchAutocomplete user={user} language={language} onNavigate={onNavigate} />
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
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">{language === 'ar' ? 'EN' : 'ع'}</span>
              </button>

              {/* Notifications */}
              <NotificationDropdown user={user} language={language} onNavigate={onNavigate} />

              {/* Profile Menu Actions */}
              <div className="flex items-center gap-4">
                <span className="text-[var(--text-secondary)] hidden lg:block hover:text-[var(--text-primary)] cursor-pointer transition-colors" onClick={() => onNavigate('settings')}>{t.account}</span>
                
                {/* Mobile avatar link to settings */}
                <button 
                  onClick={() => onNavigate('settings')}
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
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
