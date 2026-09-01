import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Language, User } from '../../App';
import { Package, Clock, CheckCircle2, XCircle, AlertTriangle, Ship, Calendar, FileText } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { wharfService } from '../../services/wharfService';
import { PageHeader } from '../ui/PageHeader';
import { exportDischargeRequestPdf } from '../../utils/exportPdf';

interface WharfDischargeRequestsProps {
  user: User;
  language: Language;
}

interface ContainerData {
  id: number;
  description_of_goods: string;
  storage_type: string;
  location?: string;
  status: string;
}

interface DischargeRequestBatch {
  batch_id: string;
  vessel: { name: string } | null;
  trader: { name: string; email: string } | null;
  status: string;
  requested_date: string;
  rejection_reason?: string;
  notes?: string;
  containers: ContainerData[];
  created_at: string;
}

export function WharfDischargeRequests({ user, language }: WharfDischargeRequestsProps) {
  const isRTL = language === 'ar';
  const { data: notifications = [], markAllAsRead } = useNotifications(user);

  useEffect(() => {
    // Automatically mark all as read when unread notifications are loaded
    const hasUnread = notifications.some(n => n.status === 'unread' || n.status === 'pending');
    if (hasUnread) {
      markAllAsRead();
    }
  }, [notifications.length, markAllAsRead]);
  const [batches, setBatches] = useState<DischargeRequestBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Modals state
  const [showWarningModal, setShowWarningModal] = useState<string | null>(null); // batch_id
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null); // batch_id
  const [declineReason, setDeclineReason] = useState('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await wharfService.getDischargeRequests();
      setBatches(data);
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل طلبات التفريغ' : 'Failed to load discharge requests');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (batchId: string) => {
    setProcessing(batchId);
    try {
      await wharfService.approveDischargeRequest(batchId);
      toast.success(isRTL ? 'تم الموافقة على طلب التفريغ بنجاح' : 'Discharge request approved successfully');
      setShowWarningModal(null);
      // Optimistically update status to approved so the UI updates instantly
      setBatches(prev => prev.map(b => b.batch_id === batchId ? { ...b, status: 'approved' } : b));
      await loadData(true); // Silent reload
    } catch (error) {
      toast.error(isRTL ? 'فشل الموافقة على الطلب' : 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDeclineModal || !declineReason.trim()) return;

    setProcessing(showDeclineModal);
    try {
      await wharfService.declineDischargeRequest(showDeclineModal, declineReason);
      toast.success(isRTL ? 'تم رفض طلب التفريغ' : 'Discharge request declined');
      setShowDeclineModal(null);
      // Optimistically update status to declined
      setBatches(prev => prev.map(b => b.batch_id === showDeclineModal ? { ...b, status: 'declined', rejection_reason: declineReason } : b));
      setDeclineReason('');
      await loadData(true); // Silent reload
    } catch (error) {
      toast.error(isRTL ? 'فشل رفض الطلب' : 'Failed to decline request');
    } finally {
      setProcessing(null);
    }
  };

  const pendingBatches = batches.filter(b => b.status === 'pending');
  const historyBatches = batches.filter(b => b.status !== 'pending');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      <PageHeader
        title={isRTL ? 'إدارة طلبات التفريغ' : 'Discharge Requests Management'}
        subtitle={isRTL ? 'مراجعة والموافقة على طلبات تفريغ الحاويات' : 'Review and approve container discharge requests'}
        language={language}
      />

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-20 text-center shadow-sm">
          <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري التحميل...' : 'Loading...'} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Requests */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {isRTL ? 'الطلبات المعلقة' : 'Pending Requests'}
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
                {pendingBatches.length}
              </span>
            </h2>

            {pendingBatches.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
                  {isRTL ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {isRTL ? 'جميع الطلبات قد تمت معالجتها' : 'All requests have been processed'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {pendingBatches.map(batch => (
                  <div key={batch.batch_id} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Info */}
                    <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                              {isRTL ? 'قيد الانتظار' : 'Pending'}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">
                              ID: {batch.batch_id}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Ship className="w-5 h-5 text-blue-500" />
                            {batch.vessel?.name || 'Unknown Vessel'}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                            {isRTL ? 'التاجر' : 'Trader'}
                          </p>
                          <p className="text-slate-900 dark:text-slate-50 text-sm font-medium">
                            {batch.trader?.name || 'Unknown Trader'}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">
                            {batch.trader?.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                            {isRTL ? 'تاريخ التفريغ' : 'Discharge Date'}
                          </p>
                          <p className="text-slate-900 dark:text-slate-50 text-sm font-medium flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(batch.requested_date)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
                          {isRTL ? `الحاويات المشمولة (${batch.containers.length})` : `Included Containers (${batch.containers.length})`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {batch.containers.map(c => (
                            <span key={c.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-slate-300">
                              #{c.id.toString().padStart(5, '0')} - {c.storage_type}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Trader Notes */}
                      {batch.notes && (
                        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
                          <p className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
                            {isRTL ? 'ملاحظات التاجر' : 'Trader Notes'}
                          </p>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">{batch.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="p-6 md:w-64 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-center gap-3">
                      <button
                        onClick={() => setShowWarningModal(batch.batch_id)}
                        disabled={processing === batch.batch_id}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        {isRTL ? 'موافقة' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowDeclineModal(batch.batch_id)}
                        disabled={processing === batch.batch_id}
                        className="w-full bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-3 rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5" />
                        {isRTL ? 'رفض' : 'Decline'}
                      </button>
                      <button
                        onClick={() => exportDischargeRequestPdf(batch as any, 'wharf')}
                        className="w-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 py-3 rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        {isRTL ? 'تصدير PDF' : 'Export PDF'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          {historyBatches.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2 mt-8">
                <Package className="w-5 h-5 text-slate-500" />
                {isRTL ? 'السجل' : 'History'}
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{isRTL ? 'الدفعة' : 'Batch ID'}</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{isRTL ? 'السفينة' : 'Vessel'}</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{isRTL ? 'الحاويات' : 'Containers'}</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{isRTL ? 'التاريخ' : 'Date'}</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">{isRTL ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {historyBatches.map(batch => (
                      <tr key={batch.batch_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors">
                        <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-300">{batch.batch_id}</td>
                        <td className="p-4 text-sm font-medium text-slate-900 dark:text-slate-50">{batch.vessel?.name || '-'}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{batch.containers.length}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(batch.created_at)}</td>
                        <td className="p-4">
                          {batch.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isRTL ? 'موافق عليه' : 'Approved'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={batch.rejection_reason}>
                              <XCircle className="w-3.5 h-3.5" />
                              {isRTL ? 'مرفوض' : 'Declined'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => exportDischargeRequestPdf(batch as any, 'wharf')}
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title={isRTL ? 'تصدير PDF' : 'Export PDF'}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Warning Modal (Approval) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-50">
                  {isRTL ? 'تأكيد الموافقة' : 'Confirm Approval'}
                </h3>
                <p className="text-amber-700 dark:text-amber-200 text-sm mt-1 leading-relaxed">
                  {isRTL 
                    ? 'إذا وافقت على طلب التفريغ هذا، فهذا يعني أنه من مسؤوليتك تفريغ الحاويات فعلياً من التخزين.' 
                    : 'If you approve this discharge request, that means it is your responsibility to discharge containers (physically) from the storage.'}
                </p>
              </div>
            </div>
            <div className="p-6 flex gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => handleApprove(showWarningModal)}
                disabled={processing === showWarningModal}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2"
              >
                {processing === showWarningModal ? <LoadingIndicator type="line-spinner" size="xs" /> : <CheckCircle2 className="w-4 h-4" />}
                {isRTL ? 'أنا أتحمل المسؤولية - موافق' : 'I Take Responsibility - Approve'}
              </button>
              <button
                onClick={() => setShowWarningModal(null)}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                {isRTL ? 'رفض الطلب' : 'Decline Request'}
              </h3>
            </div>
            <form onSubmit={handleDecline} className="p-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {isRTL ? 'سبب الرفض (إلزامي)' : 'Reason for decline (Required)'}
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-none mb-6 text-slate-900 dark:text-slate-50"
                placeholder={isRTL ? 'يرجى توضيح سبب رفض الطلب...' : 'Please explain why the request is declined...'}
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!declineReason.trim() || processing === showDeclineModal}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {processing === showDeclineModal ? <LoadingIndicator type="line-spinner" size="xs" /> : null}
                  {isRTL ? 'تأكيد الرفض' : 'Confirm Decline'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeclineModal(null); setDeclineReason(''); }}
                  className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
