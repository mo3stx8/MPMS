import { useState, useEffect } from 'react';
import { Language } from '../../App';
import { Anchor, Ship, FileCheck, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { getVessels, getClearances, getLogs, initializeData, Vessel, Clearance, LogEntry } from '../../utils/portOfficerApi';
import { toast } from 'react-toastify';
import { StatCard } from '../ui/StatCard';

interface PortOfficerDashboardProps {
  language: Language;
}

export function PortOfficerDashboard({ language }: PortOfficerDashboardProps) {
  const isRTL = language === 'ar';

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vesselsData, clearancesData, logsData] = await Promise.all([
        getVessels(),
        getClearances(),
        getLogs()
      ]);
      setVessels(vesselsData);
      setClearances(clearancesData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await initializeData();
      await loadData();
      toast.success(isRTL ? 'تم تهيئة البيانات بنجاح' : 'Data initialized successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error(isRTL ? 'فشل تهيئة البيانات' : 'Failed to initialize data');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    activeVessels: vessels.filter(v => v.status !== 'awaiting').length,
    awaitingBerth: vessels.filter(v => v.status === 'awaiting').length,
    pendingClearances: vessels.filter(v => v.clearanceStatus === 'pending' || v.clearanceStatus === 'none').length,
    todayAssignments: logs.filter(l => l.action === 'berth_assignment').length
  };

  const systemAlerts = [
    ...clearances
      .filter(c => c.status === 'expiring-soon')
      .map(c => ({
        id: c.id,
        type: 'expiry',
        message: isRTL ? `تصريح المغادرة ${c.clearanceId} سينتهي خلال ${c.hoursRemaining} ساعة` : `Port clearance ${c.clearanceId} expires in ${c.hoursRemaining} hours`,
        severity: 'medium' as const,
        time: isRTL ? 'حديث' : 'Recent'
      })),
    ...clearances
      .filter(c => c.status === 'expired')
      .map(c => ({
        id: c.id + '-expired',
        type: 'expiry',
        message: isRTL ? `تصريح المغادرة ${c.clearanceId} انتهت صلاحيته` : `Port clearance ${c.clearanceId} has expired`,
        severity: 'high' as const,
        time: isRTL ? 'حديث' : 'Recent'
      }))
  ].slice(0, 5);

  const recentActivity = logs.slice(0, 4).map(log => ({
    id: log.id,
    action: isRTL
      ? (log.action === 'berth_assignment' ? 'تعيين رصيف' : log.action === 'clearance_issued' ? 'إصدار تصريح مغادرة' : 'تحرير رصيف')
      : (log.action === 'berth_assignment' ? 'Berth Assignment' : log.action === 'clearance_issued' ? 'Clearance Issued' : 'Berth Release'),
    vessel: log.vessel,
    wharf: log.wharf,
    clearanceId: log.clearanceId,
    time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status: 'completed'
  }));

  if (loading && vessels.length === 0) {
    return (
      <div className="flex items-center justify-center p-20 bg-slate-50 dark:bg-slate-900 min-h-full">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحميل البيانات...' : 'Loading data...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {isRTL ? 'لوحة تحكم موظف الميناء' : 'Port Officer Operations'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isRTL ? 'إدارة الرسو وإصدار تصاريح المغادرة' : 'Manage Berthing Operations & Port Clearances'}
          </p>
        </div>
        <div className="flex gap-3">
          {vessels.length === 0 && (
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
            >
              {initializing ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-4 h-4" />}
              {isRTL ? 'تهيئة البيانات' : 'Initialize Data'}
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center"
          >
            {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={isRTL ? 'السفن الحالية' : 'Active Vessels'} value={stats.activeVessels} icon={Ship} color="blue" language={language} />
        <StatCard label={isRTL ? 'انتظار الرصيف' : 'Awaiting Berth'} value={stats.awaitingBerth} icon={Clock} color="amber" language={language} />
        <StatCard label={isRTL ? 'تصاريح معلقة' : 'Pending Clearances'} value={stats.pendingClearances} icon={FileCheck} color="teal" language={language} />
        <StatCard label={isRTL ? 'تعيينات اليوم' : "Today's Assignments"} value={stats.todayAssignments} icon={Anchor} color="emerald" language={language} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Alerts */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'تنبيهات النظام' : 'System Alerts'}</h2>
          </div>

          {systemAlerts.length > 0 ? (
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${alert.severity === 'high'
                    ? 'bg-red-100 dark:bg-red-900/30 border-l-red-600 dark:border-l-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 border-l-amber-500 dark:border-l-amber-400'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {alert.severity === 'high'
                      ? <XCircle className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-medium ${alert.severity === 'high' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{alert.message}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">{isRTL ? 'لا توجد تنبيهات' : 'No alerts'}</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'النشاط الأخير' : 'Recent Activity'}</h2>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-700 dark:text-blue-400 font-semibold text-xs uppercase tracking-wide">{activity.action}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{activity.time}</span>
                  </div>
                  <p className="text-slate-900 dark:text-slate-50 font-medium text-sm mb-2">{activity.vessel}</p>
                  <div className="flex flex-wrap gap-2">
                    {activity.wharf && (
                      <span className="text-xs px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        {isRTL ? 'الرصيف: ' : 'Wharf: '}<span className="font-medium text-slate-900 dark:text-slate-50">{activity.wharf}</span>
                      </span>
                    )}
                    {activity.clearanceId && (
                      <span className="text-xs px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        {isRTL ? 'رقم التصريح: ' : 'ID: '}<span className="font-medium text-slate-900 dark:text-slate-50">{activity.clearanceId}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">{isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
