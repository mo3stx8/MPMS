import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Ship, Anchor, FileText, Calendar, ClipboardCheck } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { agentService } from '../../services/agentService';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { echo } from '../../utils/echo';
import { getTranslatedStatus } from '../../utils/formatters';

interface RequestStatusTrackerProps {
  language: Language;
  onNavigate: (page: string) => void;
  userId?: string | number;
}

interface TimelineStep {
  step: string;
  date: string;
  user: string;
  status: 'completed' | 'pending' | 'rejected';
}

interface RequestItem {
  id: string;
  type: 'arrival' | 'anchorage' | 'manifest' | 'clearance';
  vessel: string;
  title: string;
  submittedDate: string;
  status: 'approved' | 'pending' | 'rejected' | 'completed';
  completedDate?: string;
  rejectionReason?: string;
  icon?: any;
  timeline: TimelineStep[];
}

const iconMap: Record<string, any> = {
  arrival: Ship,
  anchorage: Anchor,
  manifest: FileText,
  clearance: ClipboardCheck,
};

export function RequestStatusTracker({ language, userId }: RequestStatusTrackerProps) {
  const t = translations[language]?.agent?.tracker || translations.en.agent.tracker;
  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await agentService.getTrackerData();
        const mapped = data.map((item: any): RequestItem => ({
          ...item,
          icon: iconMap[item.type] || Clock,
        }));
        setAllRequests(mapped);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Real-time Echo listener for Port Clearance events ──────────────────
  useEffect(() => {
    if (!userId) return;

    const channelName = `App.Models.User.${userId}`;
    const channel = echo.private(channelName);

    const handleClearanceRequested = (payload: any) => {
      const newItem: RequestItem = {
        ...payload,
        icon: ClipboardCheck,
      };
      setAllRequests(prev => {
        // Avoid duplicates
        if (prev.some(r => r.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
    };

    const handleClearanceUpdated = (payload: any) => {
      const updatedItem: RequestItem = {
        ...payload,
        icon: ClipboardCheck,
      };
      setAllRequests(prev => {
        const exists = prev.findIndex(r => r.id === updatedItem.id);
        if (exists !== -1) {
          const copy = [...prev];
          copy[exists] = updatedItem;
          return copy;
        }
        // If not found, prepend
        return [updatedItem, ...prev];
      });
    };

    channel.listen('.port-clearance.requested', handleClearanceRequested);
    channel.listen('.port-clearance.updated', handleClearanceUpdated);

    return () => {
      channel.stopListening('.port-clearance.requested', handleClearanceRequested);
      channel.stopListening('.port-clearance.updated', handleClearanceUpdated);
      echo.leave(channelName);
    };
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getTimelineStepBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return getTranslatedStatus(status, language);
  };

  const getTypeIconBg = (type: string) => {
    switch (type) {
      case 'arrival': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'anchorage': return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
      case 'manifest': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'clearance': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    }
  };

  const stats = {
    total: allRequests.length,
    approved: allRequests.filter(r => r.status === 'approved' || r.status === 'completed').length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
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
          { label: t.totalRequests, value: stats.total, borderColor: 'border-b-blue-600 dark:border-b-blue-400', valColor: 'text-blue-700 dark:text-blue-400' },
          { label: t.approved, value: stats.approved, borderColor: 'border-b-green-600 dark:border-b-green-400', valColor: 'text-green-700 dark:text-green-400' },
          { label: t.pending, value: stats.pending, borderColor: 'border-b-amber-600 dark:border-b-amber-400', valColor: 'text-amber-700 dark:text-amber-400' },
          { label: t.rejected, value: stats.rejected, borderColor: 'border-b-red-600 dark:border-b-red-400', valColor: 'text-red-700 dark:text-red-400' },
        ].map((item) => (
          <div key={item.label} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-4 ${item.borderColor} rounded-lg p-4 shadow-sm`}>
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{item.label}</div>
            <div className={`text-3xl font-bold ${item.valColor}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-full" />
          {t.unifiedTimeline}
        </h2>

        {loading ? (
          <div className="text-center py-16">
            <LoadingIndicator 
              type="line-spinner" 
              size="lg" 
              label={language === 'ar' ? 'جاري مزامنة بيانات التتبع...' : 'Synchronizing tracking data...'} 
            />
          </div>
        ) : (
          <div className="relative">
            <div className={`absolute ${language === 'ar' ? 'right-6' : 'left-6'} top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full`} />

            <div className="space-y-6">
              {allRequests.map((request) => {
                const Icon = request.icon || iconMap[request.type] || Clock;
                return (
                  <div key={request.id} className="relative">
                    <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} w-12 h-12 ${getTypeIconBg(request.type)} rounded-lg flex items-center justify-center z-10 border border-slate-200 dark:border-slate-700`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className={`${language === 'ar' ? 'mr-16' : 'ml-16'} bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-5 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-200`}>
                      <div className="flex flex-col md:flex-row items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-slate-900 dark:text-slate-50 font-semibold">{request.title}</h3>
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 text-xs font-mono">#{request.id}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-2">
                            <Ship className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />{request.vessel}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {t.submitted}: {request.submittedDate}
                            </div>
                            {request.completedDate && (
                              <div className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />{request.completedDate}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusBadge(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900/30 rounded-lg flex items-start gap-3">
                          <XCircle className="w-4 h-4 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-red-700 dark:text-red-400 font-medium text-xs uppercase tracking-wider mb-1">
                              {language === 'ar' ? 'ملاحظات الإدارة' : 'Executive Feedback'}
                            </div>
                            <div className="text-red-700 dark:text-red-400 text-sm opacity-80">{request.rejectionReason}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {request.timeline.map((step, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${getTimelineStepBadge(step.status)}`}>
                              {getTranslatedStatus(step.status, language)}: {step.step}
                            </span>
                            {index < request.timeline.length - 1 && (
                              <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
