import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Users, CheckCircle, XCircle, Clock, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { executiveService } from '../../services/executiveService';
import { getTranslatedRole } from '../../utils/formatters';
import { generateGmailUrl } from '../../utils/emailUtils';

interface UserApprovalsProps {
  language: Language;
}

interface PendingUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization?: string;
  created_at: string;
  status: string;
}

export function UserApprovals({ language }: UserApprovalsProps) {
  const t = translations[language].executive.userApprovals;
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ userId: number; userName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');


  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const data = await executiveService.getPendingUsers();
      setPendingUsers(Array.isArray(data) ? data : data.users || []);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPendingUsers(); }, []);


  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      const response = await executiveService.approveUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(t.successApprove);

      if (response && response.user && response.user.email) {
        const { email, name } = response.user;
        const gmailUrl = generateGmailUrl(email, name);
        window.open(gmailUrl, '_blank');
      }
    } catch (error) {
      toast.error('Failed to approve user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.userId);
    try {
      await executiveService.rejectUser(rejectModal.userId, rejectReason);
      setPendingUsers(prev => prev.filter(u => u.id !== rejectModal.userId));
      toast.success(t.successReject);
      setRejectModal(null);
      setRejectReason('');
    } catch (error) {
      toast.error('Failed to reject user.');

    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const getRoleLabel = (role: string) => {
    return getTranslatedRole(role, language);
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
        </div>
        <button onClick={fetchPendingUsers} disabled={isLoading} className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
          {isLoading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          {language === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { count: pendingUsers.length, label: t.pendingRequests, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-700 dark:text-amber-400' },
          { count: pendingUsers.filter(u => u.role === 'agent').length, label: language === 'ar' ? 'وكلاء' : 'Agents', icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-700 dark:text-green-400' },
          { count: pendingUsers.filter(u => u.role === 'trader').length, label: language === 'ar' ? 'تجار' : 'Traders', icon: Users, bg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-700 dark:text-blue-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm flex items-center gap-4">
              <div className={`p-3 ${item.bg} rounded-lg`}><Icon className={`w-5 h-5 ${item.iconColor}`} /></div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{item.count}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingIndicator type="line-spinner" size="md" />
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-green-700 dark:text-green-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noRequests}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/25 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {[t.name, t.email, t.role, t.organization, t.submittedAt, t.actions].map((col) => (
                    <th key={col} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-900 dark:bg-blue-800 flex items-center justify-center text-white font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-50 text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-sm">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'agent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-sm">{user.organization || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-sm">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(user.id)} disabled={actionLoading === user.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 min-w-[80px] justify-center">
                          {actionLoading === user.id ? <LoadingIndicator type="line-spinner" size="xs" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          {t.approve}
                        </button>
                        <button onClick={() => setRejectModal({ userId: user.id, userName: user.name })} disabled={actionLoading === user.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" />{t.reject}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><XCircle className="w-5 h-5 text-red-700 dark:text-red-400" /></div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t.rejectTitle}</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              {language === 'ar' ? `رفض طلب: ${rejectModal.userName}` : `Rejecting request for: ${rejectModal.userName}`}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.rejectPlaceholder}
              rows={4}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:focus:border-red-400 transition-all resize-none text-sm mb-2"
            />
            <p className="text-red-600 dark:text-red-400 text-xs mb-5">{t.rejectNote}</p>
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium text-sm transition-colors">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleRejectConfirm} disabled={!rejectReason.trim() || actionLoading !== null} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/30 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2">
                {actionLoading !== null ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <ChevronRight className="w-4 h-4" />}
                {t.reject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
