import { useState, useEffect } from 'react';
import { Anchor, CheckCircle2, XCircle, AlertTriangle, Lock, Unlock, Calendar, Clock, X } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { executiveService } from '../../services/executiveService';
import { toast } from 'react-toastify';
import { getTranslatedStatus } from '../../utils/formatters';

interface AnchorageApprovalsProps {
  language: Language;
  onNavigate: (page: string, params?: { vesselId?: number | string }) => void;
}

export function AnchorageApprovals({ language, onNavigate }: AnchorageApprovalsProps) {
  const t = translations[language]?.executive?.anchorage || translations.en.executive.anchorage;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await executiveService.getAnchorageRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching anchorage requests', error);
      toast.error(language === 'ar' ? 'فشل جلب الطلبات' : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };



  const getDecisionStatusIcon = (request: any, isVesselApproved: boolean) => {
    if (request.status === 'approved' || request.status === 'wharf_assigned') return <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />;
    if (request.status === 'rejected') return <XCircle className="w-4 h-4 text-red-700 dark:text-red-400" />;
    if (isVesselApproved) return <Unlock className="w-4 h-4 text-blue-700 dark:text-blue-400" />;
    return <Lock className="w-4 h-4 text-slate-400" />;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'low':
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return 'LOW';
    if (language === 'ar') {
      const arMap: Record<string, string> = { 'high': 'عالي', 'medium': 'متوسط', 'low': 'منخفض' };
      return arMap[priority.toLowerCase()] || priority.toUpperCase();
    }
    return priority.toUpperCase();
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.total, value: requests.length, borderColor: 'border-b-amber-500 dark:border-b-amber-400', textColor: 'text-amber-700 dark:text-amber-400' },
          { label: t.readyToApprove, value: requests.filter(r => r.canApprove).length, borderColor: 'border-b-green-500 dark:border-b-green-400', textColor: 'text-green-700 dark:text-green-400' },
          { label: t.blocked, value: requests.filter(r => r.vessel?.status !== 'approved').length, borderColor: 'border-b-red-500 dark:border-b-red-400', textColor: 'text-red-700 dark:text-red-400' },
          { label: language === 'ar' ? 'مرفوضة' : 'Rejected', value: requests.filter(r => r.status === 'rejected').length, borderColor: 'border-b-slate-400 dark:border-b-slate-500', textColor: 'text-slate-700 dark:text-slate-300' },
        ].map((item) => (
          <div key={item.label} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-4 ${item.borderColor} rounded-lg p-4 shadow-sm`}>
            <div className={`text-2xl font-bold ${item.textColor} mb-1`}>{item.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingIndicator type="line-spinner" size="lg" label={language === 'ar' ? 'جاري جلب الطلبات...' : 'Fetching requests...'} />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
          <Anchor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests found'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const isVesselApproved = request.vessel?.status === 'approved';
            return (
              <div key={request.id} className={`bg-white dark:bg-slate-800 border rounded-lg shadow-sm overflow-hidden ${isVesselApproved ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-900/30'}`}>
                <div className="p-5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${isVesselApproved ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        {isVesselApproved ? <Anchor className="w-5 h-5 text-blue-700 dark:text-blue-400" /> : <Lock className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div>
                        <h3 className="text-slate-900 dark:text-slate-50 font-semibold">{request.vessel?.name || 'Unknown Vessel'}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">{t.requestId}: AR-{request.id}</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs"><Calendar className="w-3 h-3" />{new Date(request.docking_time).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{t.arrivalRef}: AN-{request.vessel_id}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.vessel?.priority)}`}>
                      {t.priority}: {getPriorityLabel(request.vessel?.priority)}
                    </span>
                  </div>

                  {/* Approval Checklist */}
                  <div className="bg-slate-50 dark:bg-slate-700/25 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                    <div className="text-slate-900 dark:text-slate-50 font-medium text-sm mb-3">{t.approvalChecklist}</div>
                    <div className="space-y-3">
                      {[
                        {
                          label: t.arrivalApprovalCheck,
                          subLabel: t.approved,
                          passed: true,
                        },
                        {
                          label: t.executiveDecision,
                          subLabel: (request.status === 'approved' || request.status === 'wharf_assigned')
                            ? t.approvedFromWharf
                            : request.status === 'rejected'
                              ? t.rejectedFromWharf
                              : getTranslatedStatus(request.status, language) || (isVesselApproved ? t.readyForDecision : t.blocked),
                          icon: getDecisionStatusIcon(request, isVesselApproved),
                          passed: request.status === 'approved' || request.status === 'wharf_assigned' ? true : request.status === 'rejected' ? false : null,
                        },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.passed === true ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400' : step.passed === false ? 'bg-amber-100 border-amber-500 dark:bg-amber-900/30 dark:border-amber-400' : 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400'}`}>
                            {i === 1 ? step.icon : step.passed ? <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" /> : <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
                          </div>
                          <div>
                            <div className="text-slate-900 dark:text-slate-50 text-sm font-medium">{step.label}</div>
                            <div className={`text-xs ${step.passed ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{step.subLabel}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Block Warning */}
                  {!isVesselApproved && request.status === 'pending' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-red-700 dark:text-red-400 font-semibold text-sm mb-0.5">{t.approvalBlocked}</div>
                          <div className="text-red-600 dark:text-red-300 text-xs">{language === 'ar' ? 'السفينة لم تتم الموافقة عليها أو غير نشطة' : 'Vessel is not approved or inactive'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {[
                      { label: t.agent, value: request.vessel?.owner?.name || 'Unknown Agent' },
                      { label: t.duration, value: `${request.duration} ${language === 'ar' ? 'ساعات' : 'hours'}` },
                      { label: t.submitted, value: new Date(request.created_at).toLocaleString() },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.label}</div>
                        <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Reason */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.reason}</div>
                    <div className="text-slate-900 dark:text-slate-50 text-sm">
                      {request.vessel?.priority_reason || request.vessel?.purpose || request.reason}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => onNavigate('vessel-history', { vesselId: request.vessel_id || request.vessel?.id })} className="flex-1 items-center justify-center gap-2 py-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg font-medium text-sm transition-colors flex">
                      <Clock className="w-4 h-4" /><span>{language === 'ar' ? 'السجل' : 'History'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}
