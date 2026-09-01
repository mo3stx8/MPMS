import { useState, useEffect } from 'react';
import { Language } from '../../App';
import { Package, BoxSelect, FileText, AlertTriangle, RefreshCw, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { traderService, TraderStats } from '../../services/traderService';
import { StatCard } from '../ui/StatCard';
import { PageHeader } from '../ui/PageHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface TraderDashboardProps {
  language: Language;
  userEmail: string;
  onNavigate: (page: string) => void;
}

export function TraderDashboard({ language, userEmail, onNavigate }: TraderDashboardProps) {
  const isRTL = language === 'ar';
  const [stats, setStats] = useState<TraderStats>({
    arrived: 0,
    stored: 0,
    readyForDischarge: 0,
    unreadNotifications: 0,
    pendingDischarges: 0,
    statusChangeAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await traderService.getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading trader dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeData = async () => {
    setInitializing(true);
    try {
      await traderService.initializeData(userEmail);
      await loadDashboardData();
    } catch (error) {
      console.error('Error initializing trader data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userEmail]);

  const statCards = [
    {
      title: isRTL ? 'حاويات وصلت' : 'Arrived',
      value: stats.arrived,
      icon: Package,
      color: 'blue' as const,
      trend: { value: isRTL ? 'نشط' : 'Active', direction: 'neutral' as const },
      onClick: () => onNavigate('containers')
    },
    {
      title: isRTL ? 'حاويات مخزنة' : 'Stored',
      value: stats.stored,
      icon: BoxSelect,
      color: 'emerald' as const,
      trend: { value: '', direction: 'neutral' as const },
      onClick: () => onNavigate('containers')
    },
    {
      title: isRTL ? 'جاهزة للتفريغ' : 'Ready for Discharge',
      value: stats.readyForDischarge,
      icon: CheckCircle2,
      color: 'teal' as const,
      trend: { value: '', direction: 'neutral' as const },
      onClick: () => onNavigate('containers')
    },
    {
      title: isRTL ? 'إشعارات غير مقروءة' : 'Unread Notifications',
      value: stats.unreadNotifications,
      icon: AlertTriangle,
      color: 'amber' as const,
      trend: { value: '', direction: 'neutral' as const },
      onClick: () => onNavigate('notifications')
    }
  ];

  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Header */}
      <PageHeader
        title={isRTL ? 'لوحة تحكم التاجر' : 'Trader Dashboard'}
        subtitle={isRTL ? 'نظرة عامة على الحاويات وحالة التفريغ' : 'Overview of containers and discharge status'}
        language={language}
        actions={[
          {
            label: isRTL ? 'تحديث' : 'Refresh',
            icon: RefreshCw,
            onClick: loadDashboardData,
            loading: loading,
            variant: 'secondary'
          },
          {
            label: isRTL ? 'تهيئة البيانات' : 'Initialize Data',
            icon: Package,
            onClick: initializeData,
            loading: initializing,
            variant: 'primary'
          }
        ]}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            language={language}
            trend={stat.value > 0 && stat.trend.value ? stat.trend : undefined}
            onClick={stat.onClick}
          />
        ))}
      </div>

      {/* Status Alerts */}
      {stats.statusChangeAlerts > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                {isRTL ? 'تحديثات الحالة' : 'Status Updates'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                {isRTL
                  ? `لديك ${stats.statusChangeAlerts} تنبيهات جديدة حول تغييرات حالة الحاوية`
                  : `You have ${stats.statusChangeAlerts} new alerts about container status changes`}
              </p>
              <button 
                onClick={() => onNavigate('notifications')}
                className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
              >
                {isRTL ? 'عرض التفاصيل' : 'View Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Discharges Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {isRTL ? 'طلبات التفريغ المعلقة' : 'Pending Discharge Requests'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mt-0.5">
                {isRTL ? 'في انتظار الموافقة' : 'Awaiting approval'}
              </p>
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-6">{stats.pendingDischarges}</div>
          <button 
            onClick={() => onNavigate('discharge')}
            className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors duration-200"
          >
            {isRTL ? 'عرض الطلبات' : 'View Requests'}
            <ArrowRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mt-0.5">
                {isRTL ? 'آخر التحديثات' : 'Latest updates'}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-2">
                <LoadingIndicator type="line-spinner" size="sm" />
              </div>
            ) : stats.readyForDischarge > 0 || stats.arrived > 0 ? (
              <>
                {stats.readyForDischarge > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-900 dark:text-slate-50 text-sm">
                      {isRTL ? `${stats.readyForDischarge} حاوية جاهزة للتفريغ` : `${stats.readyForDischarge} containers ready for discharge`}
                    </span>
                  </div>
                )}
                {stats.arrived > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-900 dark:text-slate-50 text-sm">
                      {isRTL ? `${stats.arrived} حاوية وصلت حديثاً` : `${stats.arrived} containers recently arrived`}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
                {isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Container Summary Legend */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">
          {isRTL ? 'دليل حالة الحاوية' : 'Container Status Legend'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-200">
            <StatusBadge status="arrived" type="info" label={isRTL ? 'وصلت' : 'Arrived'} />
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              {isRTL ? 'وصلت إلى الميناء' : 'Container arrived at port'}
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-200">
            <StatusBadge status="stored" type="success" label={isRTL ? 'مخزنة' : 'Stored'} />
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              {isRTL ? 'تم تعيين موقع التخزين' : 'Assigned to storage location'}
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-200">
            <StatusBadge status="ready" type="active" label={isRTL ? 'جاهزة' : 'Ready'} />
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              {isRTL ? 'جاهزة للتفريغ' : 'Ready for discharge'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
