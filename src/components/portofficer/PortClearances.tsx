import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

import { Language } from '../../App';
import { FileCheck, Ship, Clock, CheckCircle, AlertCircle, QrCode, X, RefreshCw, Download } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { getClearances, approveClearance, rejectClearance, Clearance } from '../../utils/portOfficerApi';
import { API_BASE_URL } from '@/services/api';


// ─── Toast Notification System ────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface ToastMsg { id: number; message: string; type: ToastType }

function Toast({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-[280px] max-w-sm ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : t.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-blue-700 text-white border-blue-600'
          }`}
        >
          {t.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
          {t.type === 'error'   && <AlertCircle className="w-5 h-5 shrink-0" />}
          {t.type === 'info'    && <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100 transition-opacity ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  let nextId = 0;

  const showToast = useCallback((message: string, type: ToastType = 'info', durationMs = 4000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismiss };
}
// ─────────────────────────────────────────────────────────────────────────────

interface PortClearancesProps {
  language: Language;
}

export function PortClearances({ language }: PortClearancesProps) {
  const isRTL = language === 'ar';
  const { toasts, showToast, dismiss } = useToast();

  const [selectedClearance, setSelectedClearance] = useState<Clearance | null>(null);
  const [showQRModal, setShowQRModal]             = useState(false);
  const [clearances, setClearances]               = useState<Clearance[]>([]);
  const [loading, setLoading]                     = useState(true);

  // Inline rejection modal state
  const [rejectTargetId, setRejectTargetId]   = useState<string | null>(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [rejecting, setRejecting]             = useState(false);

  // Per-card approval loading state
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setLoading(true);
    try {
      const clearancesData = await getClearances();
      setClearances(clearancesData);
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل بيانات التصاريح' : 'Failed to load clearances data');
      console.error('Error loading clearances:', error);
      showToast(isRTL ? 'فشل تحميل البيانات' : 'Failed to load clearances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);



  // ── Approve Handler ──────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    // Mark this card as loading
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      const response = await approveClearance(id);
      
      const data = response.data || response;
      
      // Calculate new hours remaining
      const expiry = new Date(data.expiry_date);
      const now = new Date();
      const hours = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Optimistically mutate local state → triggers instant re-render
      setClearances((prev) =>
        prev.map((c) =>
          c.id === id ? { 
            ...c, 
            status: 'clearance_approved',
            certificate_path: data.certificate_path,
            vessel: data.vessel?.name || c.vessel,
            nextPort: data.next_port || c.nextPort,
            issueTime: data.issue_date,
            expiryTime: data.expiry_date,
            hoursRemaining: hours,
          } : c
        )
      );

      showToast(
        isRTL ? 'تمت الموافقة على التصريح بنجاح ✓' : 'Clearance approved successfully ✓',
        'success'
      );
    } catch (e: any) {
      console.error('Error approving clearance:', e);
      showToast(
        e?.response?.data?.message || (isRTL ? 'فشل الموافقة على التصريح' : 'Failed to approve clearance'),
        'error'
      );
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ── Reject Handler ───────────────────────────────────────────────────────────
  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectTargetId || !rejectReason.trim() || rejecting) return;
    setRejecting(true);
    try {
      await rejectClearance(rejectTargetId, rejectReason.trim());

      // Optimistically mutate local state
      setClearances((prev) =>
        prev.map((c) =>
          c.id === rejectTargetId ? { ...c, status: 'rejected' } : c
        )
      );

      showToast(
        isRTL ? 'تم رفض التصريح' : 'Clearance rejected',
        'info'
      );
      setRejectTargetId(null);
      setRejectReason('');
    } catch (e: any) {
      console.error('Error rejecting clearance:', e);
      showToast(
        e?.response?.data?.message || (isRTL ? 'فشل رفض التصريح' : 'Failed to reject clearance'),
        'error'
      );
    } finally {
      setRejecting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
      case 'clearance_approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_clearance':  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'expiring-soon':      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'expired':
      case 'rejected':           return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:                   return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':             return isRTL ? 'ساري'         : 'Valid';
      case 'clearance_approved':return isRTL ? 'معتمد ✓'      : 'Approved ✓';
      case 'pending_clearance': return isRTL ? 'قيد المراجعة' : 'Pending Review';
      case 'expiring-soon':     return isRTL ? 'ينتهي قريباً' : 'Expiring Soon';
      case 'expired':           return isRTL ? 'منتهي'        : 'Expired';
      case 'rejected':          return isRTL ? 'مرفوض'        : 'Rejected';
      default:                  return status;
    }
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'valid':
      case 'clearance_approved': return 'border-l-4 border-l-green-500 dark:border-l-green-400';
      case 'pending_clearance':  return 'border-l-4 border-l-blue-500 dark:border-l-blue-400';
      case 'expiring-soon':      return 'border-l-4 border-l-amber-500 dark:border-l-amber-400';
      case 'expired':
      case 'rejected':           return 'border-l-4 border-l-red-500 dark:border-l-red-400';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
      case 'clearance_approved': return <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400" />;
      case 'pending_clearance': return <Clock className="w-5 h-5 text-blue-700 dark:text-blue-400" />;
      case 'expiring-soon': return <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400" />;
      case 'expired': 
      case 'rejected': return <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };




  const getHoursColor = (hours: number) =>
    hours < 0 ? 'text-red-700 dark:text-red-400' : hours < 6 ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400';

  const viewQRCode = (clearance: Clearance) => { setSelectedClearance(clearance); setShowQRModal(true); };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحميل البيانات...' : 'Loading data...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* ── Toast Notifications ─────────────────────────────────────────────── */}
      <Toast toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{isRTL ? 'تصاريح مغادرة الميناء' : 'Port Clearances'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRTL ? 'إصدار وإدارة تصاريح مغادرة السفن' : 'Issue and Manage Vessel Departure Clearances'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} disabled={loading} className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
            {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { count: clearances.filter(c => c.status === 'valid' || c.status === 'clearance_approved').length, label: isRTL ? 'تصاريح سارية / معتمدة' : 'Valid / Approved', icon: CheckCircle, color: 'green' },
          { count: clearances.filter(c => c.status === 'expiring-soon').length,                              label: isRTL ? 'تنتهي قريباً' : 'Expiring Soon',      icon: Clock,       color: 'amber' },
          { count: clearances.filter(c => c.status === 'expired').length,                                   label: isRTL ? 'منتهية الصلاحية' : 'Expired',         icon: AlertCircle, color: 'red'   },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${item.color === 'green' ? 'text-green-700 dark:text-green-400' : item.color === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'} mb-1`}>{item.count}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
              </div>
              <Icon className={`w-8 h-8 ${item.color === 'green' ? 'text-green-600 dark:text-green-400' : item.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} opacity-60`} />
            </div>
          );
        })}
      </div>

      {/* ── Clearances Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {clearances.map((clearance) => {
          const isApproving = approvingIds.has(clearance.id);

          return (
            <div key={clearance.id} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${getCardBorderColor(clearance.status)} rounded-lg p-5 shadow-sm transition-all duration-300`}>
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(clearance.status)}
                  <div>
                    <h3 className="text-slate-900 dark:text-slate-50 font-semibold">{clearance.clearanceId}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'رقم التصريح' : 'Clearance ID'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* ── Status Badge: mounts/unmounts on status change ── */}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(clearance.status)}`}>
                    {getStatusLabel(clearance.status)}
                  </span>
                  <button onClick={() => viewQRCode(clearance)} className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                    <QrCode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Ship className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'السفينة' : 'Vessel'}</p>
                    <p className="text-slate-900 dark:text-slate-50 font-medium text-sm">{clearance.vessel}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'الميناء التالي' : 'Next Port'}</p>
                    <p className="text-slate-900 dark:text-slate-50 font-medium text-sm">{clearance.nextPort}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'الوقت المتبقي' : 'Time Remaining'}</p>
                    <p className={`font-bold text-sm ${getHoursColor(clearance.hoursRemaining)}`}>
                      {clearance.hoursRemaining < 0 ? (isRTL ? 'منتهي' : 'Expired') : `${clearance.hoursRemaining}h`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'وقت الإصدار' : 'Issue Time'}</p>
                    <p className="text-slate-900 dark:text-slate-50 text-sm">{clearance.issueTime}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'وقت الانتهاء' : 'Expiry Time'}</p>
                    <p className="text-slate-900 dark:text-slate-50 text-sm">{clearance.expiryTime || '-'}</p>
                  </div>
                </div>
              </div>

              {/* ── Card Actions — conditional on status ───────────────────────
                  pending_clearance  → Approve + Reject buttons
                  clearance_approved → green "Approved" banner + PDF button (if cert ready)
                  All other statuses → nothing
              ──────────────────────────────────────────────────────────────── */}

              {clearance.status === 'pending_clearance' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => handleApprove(clearance.id)}
                    disabled={isApproving}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isApproving
                      ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" />
                      : <CheckCircle className="w-4 h-4" />
                    }
                    {isApproving ? (isRTL ? 'جاري الموافقة...' : 'Approving...') : (isRTL ? 'موافقة' : 'Approve')}
                  </button>
                  <button
                    onClick={() => openRejectModal(clearance.id)}
                    disabled={isApproving}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isRTL ? 'رفض' : 'Reject'}
                  </button>
                </div>
              )}

              {/* Approved: green confirmation banner + PDF link */}
              {clearance.status === 'clearance_approved' && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  {/* Green "Approved" confirmation banner — always mounted once approved */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-green-700 dark:text-green-400 text-sm font-semibold">
                      {isRTL ? 'تمت الموافقة على التصريح' : 'Clearance Approved'}
                    </span>
                  </div>
                  {/* PDF button — only mounts when backend has generated the certificate */}
                  {clearance.certificate_path && (
                    <button
                      onClick={() => window.open(`${API_BASE_URL}${clearance.certificate_path}`, '_blank')}
                      className="flex items-center justify-center gap-2 w-full bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {isRTL ? 'عرض الشهادة (PDF)' : 'View Certificate (PDF)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {clearances.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
          <FileCheck className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{isRTL ? 'لا توجد تصاريح مغادرة' : 'No clearances issued yet'}</p>
        </div>
      )}



      {/* ── Inline Rejection Reason Modal ──────────────────────────────────── */}
      {rejectTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {isRTL ? 'رفض التصريح' : 'Reject Clearance'}
                </h3>
              </div>
              <button
                onClick={() => { setRejectTargetId(null); setRejectReason(''); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                {isRTL ? 'سبب الرفض *' : 'Rejection Reason *'}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder={isRTL ? 'أدخل سبب الرفض بوضوح...' : 'Enter rejection reason clearly...'}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setRejectTargetId(null); setRejectReason(''); }}
                className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 py-2.5 rounded-lg font-medium transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || rejecting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {rejecting ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <AlertCircle className="w-4 h-4" />}
                {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ──────────────────────────────────────────────────── */}
      {showQRModal && selectedClearance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'رمز QR للتصريح' : 'Clearance QR Code'}</h3>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 mb-4">
              <div className="aspect-square bg-gradient-to-br from-blue-600 to-blue-900 rounded-lg flex items-center justify-center">
                <QrCode className="w-40 h-40 text-white" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'رقم التصريح' : 'Clearance ID'}</p>
                <p className="text-slate-900 dark:text-slate-50 font-semibold">{selectedClearance.clearanceId}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'السفينة' : 'Vessel'}</p>
                <p className="text-slate-900 dark:text-slate-50 font-semibold">{selectedClearance.vessel}</p>
              </div>
            </div>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm">{isRTL ? 'امسح هذا الرمز للتحقق من صحة التصريح' : 'Scan this code to validate the clearance'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
