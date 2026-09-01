import React, { useEffect } from 'react';
import { User, Language } from '../App';
import { translations } from '../utils/translations';
import { useNotifications } from '../hooks/useNotifications';
import { Bell, ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, CheckCheck } from 'lucide-react';
import { getLocalizedNotificationMessage, getLocalizedNotificationTitle } from '../utils/notificationUtils';

interface NotificationsPageProps {
  user: User;
  language: Language;
}

export function NotificationsPage({ user, language }: NotificationsPageProps) {
  const t = translations[language]?.agent || translations.en.agent;
  const { data: notifications = [], isLoading, markAllAsRead, markAsRead } = useNotifications(user);

  const hasUnreadDb = notifications.some(n => 
    (n.status === 'unread' || n.status === 'pending') && 
    String(n.id).startsWith('db-')
  );

  useEffect(() => {
    // Automatically mark all database notifications as read when page is opened
    if (hasUnreadDb) {
      markAllAsRead();
    }
  }, [hasUnreadDb, markAllAsRead]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': 
      case 'unread': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <AlertCircle className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/10 border-red-500/20 text-red-500';
      case 'pending': 
      case 'unread': return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      default: return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {language === 'ar' ? 'جميع الإشعارات' : 'All Notifications'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {language === 'ar' ? 'عرض جميع التحديثات والأنشطة' : 'View all updates and activities'}
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-primary)] border border-secondary rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            {language === 'ar' ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications available'}</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-6 transition-colors flex items-start gap-4 cursor-pointer ${notif.status === 'unread' || notif.status === 'pending' ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/5'}`}
                onClick={() => {
                  if (notif.status === 'unread' || notif.status === 'pending') {
                    markAsRead(notif.id);
                  }
                }}
              >
                <div className="mt-1 flex-shrink-0">
                  {getStatusIcon(notif.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">{getLocalizedNotificationTitle(notif, language)}</h3>
                    <span className="text-sm text-[var(--text-secondary)] flex-shrink-0 ml-4">
                      {new Date(notif.submittedTimestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] mb-3">
                    {getLocalizedNotificationMessage(notif, language)}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Ref: <span className="font-medium text-[var(--text-primary)]">{notif.operationId}</span>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      From: <span className="font-medium text-[var(--text-primary)]">{notif.senderName} ({notif.senderRole})</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getNotificationColor(notif.status)}`}>
                      {notif.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
