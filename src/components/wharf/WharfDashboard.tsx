import { useState, useEffect } from 'react';
import { Language, User } from '../../App';
import { Anchor, Package, BoxSelect, AlertTriangle, TrendingUp, RefreshCw, Database, Clock, Ship, CheckCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { wharfService, WharfStats, WharfAlert } from '../../services/wharfService';
import { toast } from 'react-toastify';
import { StatCard } from '../ui/StatCard';
import { PageHeader } from '../ui/PageHeader';

interface WharfDashboardProps {
  user: User;
  language: Language;
}

export function WharfDashboard({ user, language }: WharfDashboardProps) {
  const isRTL = language === 'ar';
  const { data: notifications = [], markAllAsRead } = useNotifications(user);

  useEffect(() => {
    // Automatically mark all as read when unread notifications are loaded
    const hasUnread = notifications.some(n => n.status === 'unread' || n.status === 'pending');
    if (hasUnread) {
      markAllAsRead();
    }
  }, [notifications.length, markAllAsRead]);
  const [stats, setStats] = useState<WharfStats>({
    pendingAvailability: 0,
    approvedWharves: 0,
    occupiedWharves: 0,
    storageUsed: 0,
    storageAvailable: 0,
    containersAwaiting: 0
  });
  const [alerts, setAlerts] = useState<WharfAlert[]>([]);
  const [wharves, setWharves] = useState<any[]>([]);
  const [anchorageRequests, setAnchorageRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedWharfMap, setSelectedWharfMap] = useState<Record<number, number>>({});
  const [initializing, setInitializing] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, alertsData, wharvesData, anchorageData] = await Promise.all([
        wharfService.getDashboardStats(),
        wharfService.getAlerts(),
        wharfService.getWharves(),
        wharfService.getAnchorageRequests()
      ]);
      setStats(statsData);
      setAlerts(alertsData);
      setWharves(wharvesData || []);
      setAnchorageRequests(anchorageData.requests || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const initializeData = async () => {
    setInitializing(true);
    try {
      await wharfService.initializeData();
      await loadDashboardData();
      toast.success(isRTL ? 'تم تهيئة البيانات بنجاح' : 'Data initialized successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error(isRTL ? 'فشل تهيئة البيانات' : 'Failed to initialize data');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeContainerCount = stats.storageUsed;
  const capacityPercentage = Math.round((activeContainerCount / 4000) * 100);

  const waitlistedRequests = anchorageRequests.filter(r => r.status === 'waiting');
  const availableWharves = wharves.filter(w => w.status === 'available');

  const handleQuickAssign = async (requestId: number) => {
    const wharfId = selectedWharfMap[requestId];
    if (!wharfId) {
      toast.error(isRTL ? 'يرجى اختيار رصيف أولاً' : 'Please select a wharf first');
      return;
    }
    setProcessing(requestId);
    try {
      await wharfService.approveAnchorageRequest(requestId, wharfId);
      toast.success(isRTL ? 'تم تعيين الرصيف بنجاح!' : 'Wharf assigned successfully!');
      setSelectedWharfMap(prev => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      await loadDashboardData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (isRTL ? 'فشل تعيين الرصيف' : 'Failed to assign wharf'));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Header */}
      <PageHeader
        title={isRTL ? 'لوحة تحكم الأرصفة والتخزين' : 'Wharf & Storage Dashboard'}
        subtitle={isRTL ? 'نظرة عامة على العمليات' : 'Operations Overview'}
        language={language}
        actions={[
          { label: isRTL ? 'تحديث' : 'Refresh', icon: RefreshCw, onClick: loadDashboardData, loading: loading, variant: 'secondary' },
          { label: isRTL ? 'تهيئة البيانات' : 'Initialize Data', icon: Database, onClick: initializeData, loading: initializing, variant: 'primary' }
        ]}
      />

      {/* Action Required: Waitlist Section */}
      {waitlistedRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {isRTL ? 'إجراء مطلوب: قائمة الانتظار' : 'Action Required: Waitlist'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {isRTL ? `${waitlistedRequests.length} سفن تنتظر تعيين الأرصفة` : `${waitlistedRequests.length} vessels awaiting wharf assignment`}
                </p>
              </div>
            </div>
            {availableWharves.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {availableWharves.length} {isRTL ? 'رصيف متاح' : 'wharves free'}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {waitlistedRequests.map((request) => (
              <div key={request.id} className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Ship className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-slate-50 font-medium text-sm">{request.vessel?.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">#{request.id} · {request.duration}h duration</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <select
                    value={selectedWharfMap[request.id] || ''}
                    onChange={(e) => setSelectedWharfMap(prev => ({...prev, [request.id]: Number(e.target.value)}))}
                    disabled={availableWharves.length === 0}
                    className="flex-1 md:w-44 px-3 py-2.5 sm:py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:opacity-40 transition-colors"
                  >
                    <option value="">{isRTL ? '-- اختر رصيفاً --' : '-- Select Wharf --'}</option>
                    {availableWharves.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleQuickAssign(request.id)}
                    disabled={!selectedWharfMap[request.id] || processing === request.id}
                    className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2.5 sm:py-2 rounded-lg font-medium text-xs transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap min-w-[100px] justify-center"
                  >
                    {processing === request.id ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-3 h-3" />}
                    {isRTL ? 'تعيين' : 'Assign'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={isRTL ? 'طلبات توفر معلقة' : 'Pending Availability'} value={stats.pendingAvailability} icon={Anchor} color="amber" language={language} trend={{ value: isRTL ? 'تتطلب مراجعة' : 'Requires review', direction: 'neutral' }} />
        <StatCard label={isRTL ? 'حالة الأرصفة' : 'Wharf Status'} value={stats.approvedWharves} icon={Anchor} color="blue" language={language} trend={{ value: `${stats.occupiedWharves} ${isRTL ? 'محتل' : 'occupied'}`, direction: 'neutral' }} />

        {/* Storage Capacity Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{capacityPercentage}%</span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
            {isRTL ? 'سعة التخزين' : 'Storage Capacity'}
          </h3>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${capacityPercentage >= 90 ? 'bg-red-600 dark:bg-red-500' : capacityPercentage >= 70 ? 'bg-amber-500' : 'bg-green-600 dark:bg-green-500'}`}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-50">{activeContainerCount}</span> / 4000 {isRTL ? 'مستخدم' : 'used'}
          </p>
        </div>

        <StatCard label={isRTL ? 'طلبات التفريغ' : 'Discharge Requests'} value={stats.containersAwaiting} icon={BoxSelect} color="green" language={language} trend={{ value: isRTL ? 'تتطلب معالجة' : 'Requires processing', direction: 'neutral' }} />
        <StatCard label={isRTL ? 'اتجاه السعة' : 'Capacity Trend'} value="+12%" icon={TrendingUp} color="indigo" language={language} trend={{ value: isRTL ? 'آخر 7 أيام' : 'Last 7 days', direction: 'up' }} />
        <StatCard label={isRTL ? 'التنبيهات النشطة' : 'Active Alerts'} value={alerts.length} icon={AlertTriangle} color="orange" language={language} trend={{ value: isRTL ? 'تتطلب اهتمام' : 'Requires attention', direction: 'neutral' }} />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            {isRTL ? 'تنبيهات النظام' : 'System Alerts'}
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${alert.type === 'critical'
                  ? 'bg-red-100 dark:bg-red-900/30 border-l-red-600 dark:border-l-red-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 border-l-amber-500 dark:border-l-amber-400'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`} />
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${alert.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && stats.pendingAvailability === 0 && stats.containersAwaiting === 0 && waitlistedRequests.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center shadow-sm">
          <Package className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">{isRTL ? 'لا توجد إجراءات معلقة' : 'No Pending Actions'}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            {isRTL ? 'جميع الطلبات تمت معالجتها. انقر على "تهيئة البيانات" لإنشاء بيانات عينة.' : 'All requests have been processed. Click "Initialize Data" to create sample data.'}
          </p>
        </div>
      )}
    </div>
  );
}
