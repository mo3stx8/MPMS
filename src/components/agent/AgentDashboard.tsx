import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

import { Ship, Bell, Anchor, AlertCircle, TrendingUp, Clock, Plus, Activity, FileText, Download } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { agentService, AgentStats, Activity as AgentActivity, Arrival } from '../../services/agentService';
import { exportArrivalPdf, exportAnchoragePdf, exportClearancePdf } from '../../utils/exportPdf';
import { getTranslatedStatus } from '../../utils/formatters';
import { API_BASE_URL } from '../../services/api';

// ─── Lightweight Toast System ─────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; message: string; variant: ToastVariant }

function AgentToast({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  const variantStyles: Record<ToastVariant, string> = {
    success: 'bg-emerald-600 border-emerald-500',
    error:   'bg-red-600   border-red-500',
    warning: 'bg-amber-500 border-amber-400',
    info:    'bg-blue-600  border-blue-500',
  };
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold text-white min-w-[280px] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300 ${variantStyles[t.variant]}`}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 transition-opacity ml-1 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function useAgentToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4500) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
// ─────────────────────────────────────────────────────────────────────────────

interface AgentDashboardProps {
  language: Language;
  onNavigate: (page: string) => void;
}

export function AgentDashboard({ language, onNavigate }: AgentDashboardProps) {
  const t = translations[language]?.agent?.dashboard || translations.en.agent.dashboard;
  const { toasts, showToast, dismissToast } = useAgentToast();

  const [statsData, setStatsData] = useState<AgentStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AgentActivity[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<Arrival[]>([]);
  const [vessels, setVessels] = useState<{ id: string; name: string; imo: string }[]>([]);

  // PDF Export States
  const [activeVesselId, setActiveVesselId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, trackerData, arrivals, vesselsData] = await Promise.all([
          agentService.getStats(),
          agentService.getTrackerData(),
          agentService.getUpcomingArrivals(),
          agentService.getVessels(),
        ]);
        setStatsData(stats);
        
        const mappedActivity = trackerData
          .slice(0, 10)
          .map((item: any, index: number) => ({
            id: item.id || index,
            action: item.title || item.type,
            details: `Vessel: ${item.vessel} - Status: ${item.status}`,
            ip_address: '',
            created_at: item.submittedDate || new Date().toISOString(),
            updated_at: item.submittedDate || new Date().toISOString(),
          }));
        setRecentActivity(mappedActivity);
        
        setUpcomingArrivals(arrivals);
        setVessels(vesselsData || []);
      } catch (error) {
        toast.error(language === 'ar' ? 'فشل تحميل بيانات لوحة التحكم' : 'Failed to fetch dashboard data');
        console.error('Failed to fetch dashboard data', error);
      }

    };
    fetchData();
  }, []);

  const stats = [
    { label: t.activeVessels, value: statsData?.activeVessels.toString() || '0', icon: Ship },
    {
      label: t.pendingArrivals,
      value: upcomingArrivals.filter(a => a.status === 'pending' || a.status === 'awaiting').length.toString(),
      icon: Bell,
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      label: t.anchorageRequests,
      value: statsData?.pendingClearances.toString() || '0',
      icon: Anchor,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      label: t.alerts,
      value: statsData?.notifications.toString() || '0',
      icon: AlertCircle,
      bgColor: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'active': case 'valid': return 'status-success';
      case 'rejected': case 'expired': return 'status-danger';
      case 'pending': case 'awaiting': case 'waiting': return 'status-warning';
      default: return 'status-info';
    }
  };

  const getStatusLabel = (status: string) => {
    return getTranslatedStatus(status, language);
  };

  const handleExportDocument = async (docType: 'arrival' | 'anchorage' | 'clearance') => {
    if (!activeVesselId) return;
    setIsExporting(true);
    setExportingType(docType);

    try {
      const result = await agentService.getVesselActivityReport(Number(activeVesselId));

      if (!result) {
        toast.error(language === 'ar' ? 'فشل جلب بيانات الوثيقة.' : 'Failed to fetch document data.');
        return;
      }


      // Handle both single object and array responses
      const data = Array.isArray(result) ? result[0] : result;

      // Guard: API returned null / network failure before we could get data
      if (!data) {
        toast.info(language === 'ar' ? 'لم يتم العثور على بيانات لهذه السفينة.' : 'No data found for this vessel.');
        return;
      }


      if (docType === 'arrival' && data.arrival) {
        exportArrivalPdf({
          vessel_name: data.vessel.name,
          imo_number: (data.vessel as any).imo || (data.vessel as any).imo_number || '—',
          type: (data.vessel as any).type,
          flag: (data.vessel as any).flag,
          eta: data.arrival.eta,
          status: data.arrival.status,
          purpose: data.arrival.purpose,
          cargo: data.arrival.cargo,
          priority: data.arrival.priority,
          rejection_reason: (data.arrival as any).rejection_reason,
          created_at: data.arrival.created_at,
        });
      } else if (docType === 'anchorage' && data.anchorage) {
        exportAnchoragePdf({
          id: data.anchorage.id,
          status: data.anchorage.status,
          docking_time: data.anchorage.docking_time,
          duration: data.anchorage.duration,
          reason: data.anchorage.reason,
          rejection_reason: data.anchorage.rejection_reason,
          wharf: data.anchorage.wharf,
          vessel: {
            name: data.vessel.name,
            imo_number: (data.vessel as any).imo || (data.vessel as any).imo_number || '—',
            type: (data.vessel as any).type,
            flag: (data.vessel as any).flag,
          },
          created_at: data.anchorage.created_at,
        });
      } else if (docType === 'clearance' && data.clearance) {
        if (data.clearance.certificate_path) {
          window.open(`${API_BASE_URL}${data.clearance.certificate_path}`, '_blank');
        } else {
          exportClearancePdf({
            id: data.clearance.id,
            status: data.clearance.status,
            issue_date: data.clearance.issue_date,
            expiry_date: data.clearance.expiry_date,
            next_port: data.clearance.next_port,
            vessel: {
              name: data.vessel.name,
              imo_number: (data.vessel as any).imo || (data.vessel as any).imo_number || '—',
              type: (data.vessel as any).type,
              flag: (data.vessel as any).flag,
            },
            officer: data.clearance.officer,
          });
        }
      } else {
        const labels = {
          arrival: language === 'ar' ? 'بلاغ الوصول' : 'Arrival Approval',
          anchorage: language === 'ar' ? 'طلب الرسو' : 'Anchorage Request',
          clearance: language === 'ar' ? 'تصريح مغادرة' : 'Port Clearance'
        };
        const label = labels[docType];

        toast.warning(
          language === 'ar'
            ? `لا توجد وثيقة «${label}» لهذه السفينة بعد.`
            : `No «${label}» document exists for this vessel yet.`
        );
      }

    } catch (err) {
      console.error('Export failed:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الاستخراج.' : 'An error occurred during export.');
    } finally {
      setIsExporting(false);
      setExportingType('');
    }
  };

  const pendingArrivals = upcomingArrivals.filter(a => a.status === 'pending' || a.status === 'awaiting');
  const peakArrivals = pendingArrivals.slice(0, 10);

  return (
    <div className="space-y-8 p-1">
      {/* ── Toast Notifications ──────────────────────────────────── */}
      <AgentToast toasts={toasts} onDismiss={dismissToast} />
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight drop-shadow-sm">{t.title}</h1>
          <p className="text-[var(--text-secondary)] font-medium text-lg">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--surface)]/50 border border-[var(--border-color)] rounded-2xl px-5 py-3 backdrop-blur-md shadow-sm">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-[var(--text-primary)] font-semibold">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPrimary = index === 0;

          if (isPrimary) {
            return (
              <div key={stat.label} className="relative overflow-hidden rounded-3xl p-8 shadow-2xl card-hover group bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Icon className="w-40 h-40 transform rotate-12 translate-x-8 -translate-y-8" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-100 border border-emerald-500/20 rounded-full text-xs font-bold backdrop-blur-sm">+12%</span>
                  </div>
                  <div>
                    <div className="text-5xl font-black mb-2 tracking-tight drop-shadow-md">{stat.value}</div>
                    <div className="text-blue-100 font-medium text-base opacity-90">{stat.label}</div>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                    <div className="bg-white h-full rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={stat.label} className="card-base card-hover p-8 group">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm ${stat.bgColor}`}>
                  <Icon className={`w-7 h-7 ${stat.iconColor || 'text-primary'}`} />
                </div>
                <div className="w-8 h-8 rounded-full bg-[var(--surface-highlight)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{stat.value}</div>
                <div className="text-[var(--text-secondary)] font-medium">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card-base p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 relative z-10">{t.quickActions}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <button onClick={() => onNavigate('arrivals')} className="flex items-center gap-6 p-6 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-highlight)] hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group text-left">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all duration-300">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors mb-1">{t.submitArrival}</div>
              <div className="text-[var(--text-secondary)] text-sm leading-relaxed">{t.submitArrivalDesc}</div>
            </div>
          </button>

          <button onClick={() => onNavigate('anchorage')} className="flex items-center gap-6 p-6 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-highlight)] hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group text-left">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-all duration-300">
              <Anchor className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors mb-1">{t.requestAnchorage}</div>
              <div className="text-[var(--text-secondary)] text-sm leading-relaxed">{t.requestAnchorageDesc}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Official Documents Extraction */}
      <div className="card-base p-8 relative overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--surface-highlight)] border-[var(--border-color)]">
        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3 relative z-10">
          <FileText className="w-6 h-6 text-primary" />
          {language === 'ar' ? 'استخراج الوثائق الرسمية' : 'Official Documents Extraction'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
          <div className="space-y-2">
            <label className="text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-wider block">
              <Ship className="w-3.5 h-3.5 inline mr-1.5 opacity-70" />
              {language === 'ar' ? 'اختر السفينة' : 'Select Vessel'}
            </label>
            <select
              value={activeVesselId}
              onChange={e => setActiveVesselId(e.target.value)}
              className="w-full appearance-none bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="">{language === 'ar' ? '— اختر سفينة —' : '— Select a vessel —'}</option>
              {vessels.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.imo})</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex flex-wrap gap-4">
            <button
              onClick={() => handleExportDocument('arrival')}
              disabled={!activeVesselId || isExporting}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting && exportingType === 'arrival' ? <LoadingIndicator type="line-spinner" size="xs" /> : <Download className="w-4 h-4" />}
              {language === 'ar' ? 'استخراج بلاغ الوصول' : 'Export Arrival Approval'}
            </button>
            <button
              onClick={() => handleExportDocument('anchorage')}
              disabled={!activeVesselId || isExporting}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/20 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting && exportingType === 'anchorage' ? <LoadingIndicator type="line-spinner" size="xs" /> : <Download className="w-4 h-4" />}
              {language === 'ar' ? 'استخراج طلب الرسو' : 'Export Anchorage Request'}
            </button>
            <button
              onClick={() => handleExportDocument('clearance')}
              disabled={!activeVesselId || isExporting}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting && exportingType === 'clearance' ? <LoadingIndicator type="line-spinner" size="xs" /> : <Download className="w-4 h-4" />}
              {language === 'ar' ? 'استخراج تصريح مغادرة' : 'Export Port Clearance'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card-base flex flex-col">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface)]/30">
            <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t.recentActivity}
            </h2>
            <button onClick={() => onNavigate('tracker')} className="text-primary text-sm font-bold hover:text-[var(--primary-light)] transition-colors px-3 py-1 rounded-lg hover:bg-primary/10">
              {t.viewAll}
            </button>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] py-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--background)]/30">
                <Clock className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">{t.noRecentActivity || 'No recent activity'}</p>
              </div>
            ) : recentActivity.map(activity => (
              <div key={activity.id} className="relative pl-6 pb-6 last:pb-0 border-l border-[var(--border-color)] last:border-0 group">
                <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--border-color)] group-hover:bg-primary transition-colors ring-4 ring-[var(--background)]" />
                <div className="bg-[var(--surface-highlight)]/30 rounded-xl p-4 hover:bg-[var(--surface-highlight)] transition-colors border border-[var(--border-color)] hover:border-primary/20 cursor-default">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-[var(--text-primary)] font-bold mb-1 group-hover:text-primary transition-colors">{activity.action}</div>
                      <div className="text-[var(--text-secondary)] text-sm font-medium">{activity.details}</div>
                    </div>
                  </div>
                  <div className="text-[var(--text-muted)] text-xs mt-3 flex items-center gap-2 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Arrivals */}
        <div className="card-base flex flex-col">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface)]/30">
            <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" />
              {t.upcomingArrivals}
            </h2>
            <button onClick={() => onNavigate('vessels')} className="text-primary text-sm font-bold hover:text-[var(--primary-light)] transition-colors px-3 py-1 rounded-lg hover:bg-primary/10">
              {t.viewAll}
            </button>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {peakArrivals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] py-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--background)]/30">
                <Ship className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">{t.noUpcomingArrivals || 'No pending arrivals'}</p>
              </div>
            ) : peakArrivals.map(arrival => {
              const arr = arrival as any;
              return (
                <div 
                  key={arrival.id} 
                  onClick={() => onNavigate('arrivals')}
                  className="flex flex-col p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-highlight)]/30 hover:bg-[var(--surface-highlight)] transition-all duration-300 hover:shadow-md cursor-pointer group gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                        <Ship className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[var(--text-primary)] font-bold text-lg group-hover:text-[var(--primary)] transition-colors">
                          {arr.name || arr.vessel_name || 'Unknown Vessel'}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <div className="text-[var(--text-secondary)] text-xs font-medium bg-[var(--surface)] px-2 py-0.5 rounded-md inline-block border border-[var(--border)]">
                            {language === 'ar' ? 'رقم IMO' : 'IMO'}: {arr.imo_number || arr.imo || 'N/A'}
                          </div>
                          <div className="text-[var(--text-secondary)] text-xs font-medium bg-[var(--surface)] px-2 py-0.5 rounded-md inline-block border border-[var(--border)]">
                            {language === 'ar' ? 'السبب' : 'Reason'}: {arr.reason || arr.purpose || arr.rejection_reason || 'N/A'}
                          </div>
                          <div className="text-[var(--text-secondary)] text-xs font-medium bg-[var(--surface)] px-2 py-0.5 rounded-md inline-block border border-[var(--border)]">
                            {language === 'ar' ? 'الوصول المتوقع' : 'ETA'}: {new Date(arrival.eta).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusColor(arrival.status)}`}>
                      {getStatusLabel(arrival.status)}
                    </span>
                  </div>
                </div>
                {arrival.status === 'rejected' && arrival.rejection_reason && (
                  <div className="mt-1 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-red-500 font-bold text-sm mb-1">{language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}</div>
                      <div className="text-red-400 text-sm">{arrival.rejection_reason}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
