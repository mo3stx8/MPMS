import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Ship, CheckCircle2, XCircle, AlertTriangle, Calendar, User as UserIcon, Clock, FileText, Loader2, ExternalLink, AlertCircle, X } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { executiveService, PendingApproval } from '../../services/executiveService';
import { getTranslatedVesselType, getTranslatedCargoType } from '../../utils/formatters';

interface ArrivalApprovalsProps {
  language: Language;
  onNavigate: (page: string, params?: { vesselId?: number | string }) => void;
}

export function ArrivalApprovals({ language, onNavigate }: ArrivalApprovalsProps) {
  const t = translations[language]?.executive?.arrivals || translations.en.executive.arrivals;
  const [requests, setRequests] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedManifests, setSelectedManifests] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);



  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await executiveService.getPendingApprovals();
      setRequests(data);
    } catch (err) {
      setError(language === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load requests');
      toast.error(language === 'ar' ? 'فشل تحميل طلبات الوصول.' : 'Failed to load arrival requests.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setIsProcessing(true);
      await executiveService.approveArrival(id);
      setRequests(requests.filter(r => r.vesselId !== id));
      toast.success(language === 'ar' ? 'تمت الموافقة على طلب الوصول بنجاح!' : 'Arrival request approved successfully!');
    } catch (err) {
      console.error('Error approving:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الموافقة' : 'An error occurred during approval');

    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = (request: PendingApproval) => {
    setSelectedRequest(request.vesselId);
    setSelectedManifests([]);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim() || !selectedRequest) {
      toast.warning(language === 'ar' ? 'يرجى إدخال سبب الرفض' : 'Please enter rejection reason');
      return;
    }
    try {
      setIsProcessing(true);
      await executiveService.rejectArrival(selectedRequest, rejectionReason, selectedManifests);
      setRequests(requests.filter(r => r.vesselId !== selectedRequest));
      toast.success(language === 'ar' ? 'تم رفض طلب الوصول.' : 'Arrival request rejected.');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedManifests([]);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error rejecting:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الرفض' : 'An error occurred during rejection');

    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      high: { ar: 'عاجل', en: 'High' },
      medium: { ar: 'متوسط', en: 'Medium' },
      low: { ar: 'منخفض', en: 'Low' },
    };
    return labels[priority.toLowerCase()]?.[language] || priority;
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
      </div>



      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: t.pendingApprovals, value: requests.length, borderColor: 'border-b-amber-500 dark:border-b-amber-400', textColor: 'text-amber-700 dark:text-amber-400' },
          { label: t.highPriority, value: requests.filter(r => r.priority.toLowerCase() === 'high').length, borderColor: 'border-b-red-500 dark:border-b-red-400', textColor: 'text-red-700 dark:text-red-400' },
          { label: t.avgProcessTime, value: '2.5h', borderColor: 'border-b-blue-500 dark:border-b-blue-400', textColor: 'text-blue-700 dark:text-blue-400' },
        ].map((item) => (
          <div key={item.label} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-4 ${item.borderColor} rounded-lg p-4 shadow-sm`}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{item.label}</div>
            <div className={`text-2xl font-bold ${item.textColor}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingIndicator type="line-spinner" size="lg" label={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-lg p-6 text-center">
          {error}
          <button onClick={fetchRequests} className="mt-4 block mx-auto px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors text-sm">
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
          <Ship className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1">{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{language === 'ar' ? 'جميع طلبات الوصول تمت معالجتها' : 'All arrival requests have been processed'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
              <div className="p-5">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Ship className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-900 dark:text-slate-50 font-semibold">{request.vessel.name}</h3>
                        <span className="text-xl">{request.vessel.flag}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">{t.requestId}: {request.id}</div>
                      <div className="text-slate-400 dark:text-slate-500 text-xs">{request.vessel.imo} • {getTranslatedVesselType(request.vessel.type, language)}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadge(request.priority)}`}>
                    {t.priority}: {getPriorityLabel(request.priority)}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Calendar, label: t.expectedArrival, value: request.eta },
                    { icon: UserIcon, label: t.agent, value: request.agent.name },
                    { icon: Clock, label: t.submitted, value: request.submittedDate },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                          <Icon className="w-3.5 h-3.5" />{item.label}
                        </div>
                        <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{item.value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Purpose & Cargo */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.purpose}</div>
                  <div className="text-slate-900 dark:text-slate-50 text-sm mb-2">{request.purpose}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{t.cargoType}: <span className="text-slate-900 dark:text-slate-50 font-medium">{getTranslatedCargoType(request.cargoType, language)}</span></span>
                    {request.containers > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">{t.containers}: <span className="text-slate-900 dark:text-slate-50 font-medium">{request.containers}</span></span>
                    )}
                  </div>
                </div>

                {/* Agent Justification for medium priority */}
                {(request.priority.toLowerCase() === 'medium' && request.priorityReason) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-semibold uppercase tracking-wider">{(t as any).agentJustification || 'Agent Justification'}</span>
                    </div>
                    <div className="text-amber-800 dark:text-amber-300 text-sm italic">"{request.priorityReason}"</div>
                  </div>
                )}

                {/* High priority doc */}
                {(request.priority.toLowerCase() === 'high' && request.priorityDocumentPath) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold uppercase tracking-wider">{(t as any).priorityDocumentation || 'Priority Documentation'}</span>
                      </div>
                      <div className="text-red-600 dark:text-red-300 text-xs">{(t as any).docRequiresReview || 'Review attached document before deciding.'}</div>
                    </div>
                    <a href={request.priorityDocumentPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-xs font-medium transition-colors">
                      {(t as any).viewDocument || 'View →'}
                    </a>
                  </div>
                )}

                {/* Documents / Manifests */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-2">
                    <FileText className="w-3.5 h-3.5" />{t.documents}
                  </div>
                  {request.documents && request.documents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                    {request.documents.map((doc, index) => {
                      const storageColors = {
                        chemical: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-900/40 dark:text-amber-400',
                        frozen: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-900/40 dark:text-cyan-400',
                        general: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-900/40 dark:text-green-400'
                      };
                      
                      const typeColor = storageColors[doc.storage_type as keyof typeof storageColors] || storageColors.general;
                      const title = `${doc.consignee_name} — ${doc.storage_type}`;

                      return (
                        <a
                          key={index}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs rounded-lg font-medium transition-all cursor-pointer group/doc ${typeColor}`}
                          title={title}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="max-w-[120px] truncate font-bold">{doc.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/doc:opacity-100 transition-opacity" />
                        </a>
                      );
                    })}
                  </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs italic">
                      {language === 'ar' ? 'لم يتم رفع بيانات شحن بعد' : 'No manifests uploaded yet'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => handleApprove(request.vesselId)} disabled={isProcessing} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isProcessing ? <LoadingIndicator type="line-spinner" size="xs" /> : <CheckCircle2 className="w-4 h-4" />}{t.approve}
                  </button>
                  <button onClick={() => handleReject(request)} disabled={isProcessing} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <XCircle className="w-4 h-4" />{t.reject}
                  </button>
                  <button onClick={() => onNavigate('vessel-history', { vesselId: request.vesselId })} className="flex-1 sm:flex-none sm:px-4 flex items-center justify-center gap-2 py-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg font-medium text-sm transition-colors">
                    <Clock className="w-4 h-4" /><span className="sm:hidden md:inline">{language === 'ar' ? 'السجل' : 'History'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><XCircle className="w-5 h-5 text-red-700 dark:text-red-400" /></div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t.rejectRequest}</h2>
              </div>
              <button onClick={() => { setShowRejectModal(false); setRejectionReason(''); setSelectedRequest(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{language === 'ar' ? 'يرجى تحديد الأسباب والوثائق غير المكتملة.' : 'Please specify the reasons and flag problematic documents.'}</p>

            {/* Document Checklist */}
            <div className="mb-6">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                {language === 'ar' ? 'الوثائق المرفقة' : 'Attached Documents'}
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {requests.find(r => r.vesselId === selectedRequest)?.documents?.map((doc: any, idx: number) => (
                  <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedManifests.includes(doc.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-400/30 text-red-700 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-700/20 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40'}`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-600 bg-white dark:bg-slate-800"
                      checked={selectedManifests.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedManifests([...selectedManifests, doc.id]);
                        } else {
                          setSelectedManifests(selectedManifests.filter(id => id !== doc.id));
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{doc.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{t.rejectionReason}</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t.rejectionPlaceholder}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none text-sm mb-2"
              />
              <p className="text-slate-400 dark:text-slate-500 text-xs">{t.rejectionNote}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/30 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
              >
                {isProcessing ? <LoadingIndicator type="line-spinner" size="xs" /> : <XCircle className="w-4 h-4" />}
                {t.confirmReject}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedManifests([]);
                  setSelectedManifests([]);
                  setSelectedRequest(null);
                }}
                className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}