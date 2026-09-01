import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, Ship, Anchor, BarChart3, RefreshCw, ArrowRight, Users, History } from 'lucide-react';
import { executiveService, ExecutiveStats, PendingApproval, RecentDecision } from '../../services/executiveService';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { StatCard } from '../ui/StatCard';
import { PageHeader } from '../ui/PageHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface ExecutiveDashboardProps {
  language: Language;
  onNavigate: (page: string, params?: any) => void;
}

export function ExecutiveDashboard({ language, onNavigate }: ExecutiveDashboardProps) {
  const t = translations[language]?.executive?.dashboard || translations.en.executive.dashboard;
  const isRTL = language === 'ar';

  const [statsData, setStatsData] = useState<ExecutiveStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, approvals, decisions] = await Promise.all([
        executiveService.getDashboardStats(),
        executiveService.getPendingApprovals(),
        executiveService.getRecentDecisions()
      ]);
      setStatsData(stats);
      setPendingApprovals(approvals);
      setRecentDecisions(decisions);
    } catch (error) {
      console.error("Failed to load executive dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = [
    { label: t.pendingApprovals, value: statsData?.pending_approvals.toString() || '0', icon: Clock, color: 'amber' as const },
    { label: language === 'ar' ? 'طلبات تسجيل معلقة' : 'Pending Registrations', value: statsData?.pending_users.toString() || '0', icon: Users, color: 'purple' as const },
    { label: t.blockedRequests, value: statsData?.blocked_requests.toString() || '0', icon: AlertTriangle, color: 'red' as const },
    { label: t.approvalRate, value: statsData?.approval_rate || '0%', icon: TrendingUp, color: 'emerald' as const },
    { label: t.todayDecisions, value: statsData?.today_decisions.toString() || '0', icon: CheckCircle2, color: 'blue' as const },
  ];

  const blockedRequests: any[] = [];

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      high: { ar: 'عاجل', en: 'High' },
      medium: { ar: 'متوسط', en: 'Medium' },
      low: { ar: 'منخفض', en: 'Low' },
    };
    return labels[priority]?.[language] || priority;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      arrival: { ar: 'وصول', en: 'Arrival' },
      anchorage: { ar: 'رسو', en: 'Anchorage' },
    };
    return labels[type]?.[language] || type;
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        language={language}
        actions={[
          { label: '', icon: RefreshCw, onClick: loadData, loading: loading, variant: 'secondary' },
          {
            label: new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            icon: Clock,
            onClick: () => {},
            variant: 'ghost',
            disabled: true
          }
        ]}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} language={language} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card-base p-8">
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-6">{t.quickApprovals}</h2>
        <div className="flex flex-wrap gap-6">
          {[
            { page: 'arrivals', icon: Ship, label: t.arrivalApprovals, sub: `8 ${t.pending}`, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500' },
            { page: 'anchorage', icon: Anchor, label: t.anchorageApprovals, sub: `4 ${t.pending}`, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
            { page: 'reports', icon: BarChart3, label: t.viewReports, sub: t.analytics, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
            { page: 'user-directory', icon: Users, label: language === 'ar' ? 'دليل المستخدمين' : 'User Directory', sub: language === 'ar' ? 'إدارة الحسابات والأدوار' : 'Manage accounts and roles', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
            { page: 'vessel-history', icon: History, label: language === 'ar' ? 'سجل السفن' : 'Vessel History', sub: language === 'ar' ? 'عرض السجل التاريخي للسفن' : 'View historical vessel records', iconBg: 'bg-teal-500/10', iconColor: 'text-teal-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className="flex-1 min-w-[280px] flex items-center gap-4 p-5 bg-[var(--surface)] hover:bg-[var(--secondary)]/10 border border-[var(--border)] hover:border-[var(--primary)] rounded-2xl transition-all transform hover:-translate-y-1 group"
              >
                <div className={`p-4 ${item.iconBg} rounded-xl shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-8 h-8 ${item.iconColor}`} />
                </div>
                <div className={`${language === 'ar' ? 'text-right' : 'text-left'} flex-1 min-w-0`}>
                  <div className="text-[var(--text-primary)] font-bold text-lg line-clamp-2">{item.label}</div>
                  <div className="text-[var(--text-secondary)] font-medium text-sm mt-1 line-clamp-2">{item.sub}</div>
                </div>
                <ArrowRight className={`w-5 h-5 shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{t.pendingApprovals}</h2>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {pendingApprovals.length} {t.pending}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[440px]">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="p-4 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-900 dark:text-slate-50 font-semibold">{approval.id}</span>
                      <StatusBadge
                        status={approval.priority}
                        type={approval.priority === 'high' ? 'error' : approval.priority === 'medium' ? 'warning' : 'info'}
                        label={getPriorityLabel(approval.priority)}
                      />
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                      <Ship className="w-3.5 h-3.5" />{approval.vessel.name}
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{approval.agent.name}</div>
                  </div>
                  <StatusBadge status={approval.type} type="info" label={getTypeLabel(approval.type)} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-900/30 rounded-lg text-green-700 dark:text-green-400 font-medium text-xs transition-colors flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />{t.approve}
                  </button>
                  <button className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 font-medium text-xs transition-colors flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4" />{t.reject}
                  </button>
                </div>
                <button
                  onClick={() => onNavigate('vessel-history', { vesselId: approval.vesselId })}
                  className="mt-2 w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />{language === 'ar' ? 'عرض السجل الكامل' : 'View Full History'}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('arrivals')}
            className="w-full mt-4 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
          >
            {t.viewAll}
          </button>
        </div>

        {/* Blocked + Decisions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 rounded-lg p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-slate-900 dark:text-slate-50 font-semibold text-sm mb-0.5">{t.blockedRequests}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t.blockedMessage}</p>
              </div>
            </div>
            <div className="space-y-2">
              {blockedRequests.map((request) => (
                <div key={request.id} className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{request.id} - {request.vessel}</div>
                      <div className="text-red-700 dark:text-red-400 text-xs mt-1">{request.reason}</div>
                    </div>
                    <button className="text-red-700 dark:text-red-400 text-xs font-medium hover:underline">{t.review}</button>
                  </div>
                </div>
              ))}
              {blockedRequests.length === 0 && (
                <div className="text-center py-3 text-slate-500 dark:text-slate-400 text-sm italic">
                  {isRTL ? 'لا توجد طلبات محظورة' : 'No blocked requests'}
                </div>
              )}
            </div>
          </div>

          {/* Recent Decisions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">{t.recentDecisions}</h2>
            <div className="space-y-2">
              {recentDecisions.map((decision) => (
                <div key={decision.id} className="p-3 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <div className="text-slate-900 dark:text-slate-50 text-sm font-medium">{decision.id} - {decision.vessel}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{decision.time}
                    </div>
                  </div>
                  {decision.decision === 'approved' ? (
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <XCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="w-full mt-4 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
            >
              {t.viewAllDecisions}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
