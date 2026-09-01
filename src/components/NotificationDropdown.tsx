import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { translations } from '../utils/translations';
import { User, Language } from '../App';
import { useNotifications } from '../hooks/useNotifications';
import { getLocalizedNotificationMessage, getLocalizedNotificationTitle } from '../utils/notificationUtils';

interface NotificationDropdownProps {
  user: User;
  language: Language;
  onNavigate: (page: string) => void;
}

export function NotificationDropdown({ user, language, onNavigate }: NotificationDropdownProps) {
  const t = translations[language]?.agent || translations.en.agent;
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: notifications = [], isLoading, markAllAsRead, markAsRead } = useNotifications(user);

  // Derive unread count from items marked as pending or unread
  const unreadCount = notifications.filter((notif) => ['pending', 'unread'].includes(notif.status)).length;
  
  // Limit preview to 5 most recent pending items
  const previewNotifications = notifications.slice(0, 5);

  const hasUnreadDb = notifications.some(n => 
    (n.status === 'unread' || n.status === 'pending') && 
    String(n.id).startsWith('db-')
  );

  useEffect(() => {
    // Automatically mark all database notifications as read when dropdown is opened
    if (showNotifications && hasUnreadDb) {
      markAllAsRead();
    }
  }, [showNotifications, hasUnreadDb, markAllAsRead]);

  const getNotificationColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/10 border-red-500/20 text-red-500';
      case 'pending': 
      case 'unread': return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      default: return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowNotifications(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setShowNotifications(false);
    }, 200);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => {
          setShowNotifications(false);
          onNavigate('notifications');
        }}
        className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 bg-[var(--bg-primary)] rounded-lg border border-secondary shadow-xl overflow-hidden z-50`}>
          <div className="p-4 border-b border-secondary flex justify-between items-center">
            <h3 className="font-semibold text-[var(--text-primary)]">{t.notifications || 'Notifications'}</h3>
            <span className="text-xs text-[var(--text-secondary)]">{unreadCount} Pending</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : previewNotifications.length > 0 ? (
              previewNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className="p-4 border-b border-secondary hover:bg-secondary/5 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowNotifications(false);
                    if (notif.status === 'unread' || notif.status === 'pending') {
                      markAsRead(notif.id);
                    }
                    onNavigate(notif.route ? notif.route.replace(/^\//, '') : 'notifications'); // Try to navigate to route directly (strip leading slash)
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={`inline-block px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${getNotificationColor(notif.status)}`}>
                      {notif.status}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(notif.submittedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)] text-sm mb-1 font-medium leading-tight">
                    {getLocalizedNotificationMessage(notif, language)}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-80">Ref: {notif.operationId}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-80">{getLocalizedNotificationTitle(notif, language)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                {language === 'ar' ? 'لا توجد إشعارات' : 'No new notifications'}
              </div>
            )}
          </div>
          <div className="p-3 text-center border-t border-secondary bg-secondary/5">
            <button 
              onClick={() => {
                markAllAsRead();
                onNavigate('notifications');
              }}
              className="text-sm text-accent hover:text-primary font-medium"
            >
              {t.viewAll || 'View All Notifications'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
