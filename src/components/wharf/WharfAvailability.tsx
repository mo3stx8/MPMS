import { useState, useEffect } from 'react';
import { Language, User } from '../../App';
import { Anchor, Clock, Ship, CheckCircle, RefreshCw, AlertTriangle, Inbox, ChevronDown, FileText, X, FlaskConical, ThermometerSnowflake, Box } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { wharfService } from '../../services/wharfService';
import { toast } from 'react-toastify';
import { useNotifications } from '../../hooks/useNotifications';

interface WharfAvailabilityProps {
  user: User;
  language: Language;
}

interface Wharf {
  id: number;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  vessels?: { id?: number; name: string; containers?: ContainerItem[] }[];
}

interface AnchorageRequest {
  id: number;
  vessel: { id: number; name: string; type: string; imo_number: string; priority?: string; priority_reason?: string; purpose?: string; containers?: ContainerItem[] };
  docking_time: string;
  duration: string;
  reason: string;
  status: string;
  wharf?: { id: number; name: string };
  agent?: { name: string; id: number };
  anchorage_started_at?: string;
  duration_hours?: number;
  timeout_notified_at?: string;
}

interface ContainerItem {
  id: number;
  description_of_goods: string;
  storage_type: string;
  status: string;
}

export function WharfAvailability({ user, language }: WharfAvailabilityProps) {
  const isRTL = language === 'ar';
  const { data: notifications = [], markAllAsRead } = useNotifications(user);

  useEffect(() => {
    // Automatically mark all as read when unread notifications are loaded
    const hasUnread = notifications.some(n => n.status === 'unread' || n.status === 'pending');
    if (hasUnread) {
      markAllAsRead();
    }
  }, [notifications.length, markAllAsRead]);

  const [wharves, setWharves] = useState<Wharf[]>([]);
  const [anchorageRequests, setAnchorageRequests] = useState<AnchorageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedWharfMap, setSelectedWharfMap] = useState<Record<number, number>>({});
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);
  const [expandedWaitingId, setExpandedWaitingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time timer for timeout monitoring
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);
  const [manifestVessel, setManifestVessel] = useState<{ id?: number; name: string; containers: ContainerItem[] } | null>(null);
  const [selectedContainers, setSelectedContainers] = useState<number[]>([]);
  const [confirmDischargeModal, setConfirmDischargeModal] = useState(false);

  const openManifest = (vesselId: number | null, vesselName: string, containers: ContainerItem[] = []) => {
    setManifestVessel({ id: vesselId || undefined, name: vesselName, containers });
    setSelectedContainers([]);
  };

  const pendingContainersInManifest = manifestVessel?.containers.filter(c => c.status === 'pending') || [];
  const isAllSelected = pendingContainersInManifest.length > 0 && selectedContainers.length === pendingContainersInManifest.length;

  const handleContainerToggle = (id: number) => {
    setSelectedContainers(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedContainers([]);
    } else {
      setSelectedContainers(pendingContainersInManifest.map(c => c.id));
    }
  };

  const handleDischargeApprove = async () => {
    if (!manifestVessel?.id || selectedContainers.length === 0) return;
    
    setProcessing(manifestVessel.id);
    setConfirmDischargeModal(false);
    
    try {
      await wharfService.dischargeContainers(manifestVessel.id, selectedContainers);
      toast.success(isRTL ? 'تم تفريغ الحاويات المحددة بنجاح' : 'Selected containers successfully discharged to storage');
      setManifestVessel(null);
      await loadData();
    } catch (error) {
      toast.error(isRTL ? 'فشل في تفريغ الحاويات' : 'Failed to discharge containers');
    } finally {
      setProcessing(null);
    }
  };

  const storageIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'chemical': return <FlaskConical className="w-4 h-4 text-amber-500" />;
      case 'frozen':   return <ThermometerSnowflake className="w-4 h-4 text-cyan-500" />;
      default:         return <Box className="w-4 h-4 text-slate-400" />;
    }
  };

  const storageColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'chemical': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'frozen':   return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      default:         return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wharvesData, anchorageData] = await Promise.all([
        wharfService.getWharves(),
        wharfService.getAnchorageRequests(),
      ]);
      setWharves(wharvesData);
      setAnchorageRequests(anchorageData.requests || []);
    } catch (error) {
      console.error('Error loading wharf data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMaintenance = async (wharf: Wharf) => {
    setProcessing(wharf.id);
    try {
      const newStatus = wharf.status === 'maintenance' ? 'available' : 'maintenance';
      await wharfService.updateWharfStatus(wharf.id.toString(), newStatus);
      await loadData();
    } catch (error) {
      console.error('Error updating status', error);
      toast.error(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
    } finally {
      setProcessing(null);
    }
  };

  const toggleOccupied = async (wharf: Wharf) => {
    if (wharf.status === 'occupied') {
      setProcessing(wharf.id);
      try {
        await wharfService.updateWharfStatus(wharf.id.toString(), 'available');
        toast.success(isRTL ? 'تم تحرير الرصيف' : 'Wharf released to available');
        await loadData();
      } catch (error) {
        toast.error(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
      } finally {
        setProcessing(null);
      }
    }
  };

  const handleApprove = async (request: AnchorageRequest) => {
    const wharfId = selectedWharfMap[request.id];
    if (!wharfId) {
      toast.error(isRTL ? 'يرجى اختيار رصيف أولاً' : 'Please select a wharf first');
      return;
    }
    setProcessing(request.id);
    try {
      await wharfService.approveAnchorageRequest(request.id, wharfId);
      toast.success(isRTL ? 'تم تعيين الرصيف بنجاح!' : 'Wharf assigned successfully!');
      setSelectedWharfMap((prev) => { const next = { ...prev }; delete next[request.id]; return next; });
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (isRTL ? 'فشل تعيين الرصيف' : 'Failed to assign wharf'));
    } finally {
      setProcessing(null);
    }
  };

  const handleWaitlist = async (request: AnchorageRequest) => {
    setProcessing(request.id);
    try {
      await wharfService.waitlistAnchorageRequest(request.id);
      toast.success(isRTL ? 'تم إضافة الطلب إلى قائمة الانتظار' : 'Request placed on waitlist. Agent has been notified.');
      await loadData();
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const handleTimeoutNotify = async (request: AnchorageRequest) => {
    setProcessing(request.id);
    try {
      // We'll call a new endpoint in WharfController to dispatch the notification
      await wharfService.triggerTimeoutNotification(request.id);
      toast.success(isRTL ? 'تم إرسال تنبيه انتهاء الوقت للوكيل' : 'Timeout alert sent to Agent successfully.');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (isRTL ? 'فشل إرسال التنبيه' : 'Failed to send alert'));
    } finally {
      setProcessing(null);
    }
  };

  const checkTimeout = (request: AnchorageRequest) => {
    if (request.status !== 'wharf_assigned' || !request.anchorage_started_at || !request.duration_hours) return null;
    
    const startTime = new Date(request.anchorage_started_at).getTime();
    const durationMs = request.duration_hours * 3600000;
    const expiryTime = startTime + durationMs;
    const now = currentTime.getTime();
    
    const remainingMs = expiryTime - now;
    const isExpired = remainingMs <= 0;
    
    return {
      isExpired,
      remainingText: isExpired 
        ? (isRTL ? 'منتهي' : 'Expired') 
        : `${Math.floor(remainingMs / 3600000)}h ${Math.floor((remainingMs % 3600000) / 60000)}m`
    };
  };


  const availableWharves = wharves.filter((w) => w.status === 'available');
  const pendingRequests = anchorageRequests.filter((r) => r.status === 'pending');
  const processedRequests = anchorageRequests.filter((r) => r.status !== 'pending');

  const getWharfStatusBadge = (status: string) => {
    if (status === 'available') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'maintenance') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getWharfStatusLabel = (status: string) => {
    if (status === 'available') return isRTL ? 'متاح' : 'Available';
    if (status === 'maintenance') return isRTL ? 'صيانة' : 'Maintenance';
    return isRTL ? 'مشغول' : 'Occupied';
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
    if (isRTL) {
      const arMap: Record<string, string> = { 'high': 'عالي', 'medium': 'متوسط', 'low': 'منخفض' };
      return arMap[priority.toLowerCase()] || priority.toUpperCase();
    }
    return priority.toUpperCase();
  };

  return (
    <>
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {isRTL ? 'توفر الأرصفة' : 'Wharf Availability'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isRTL ? 'إدارة توفر الأرصفة وطلبات الرسو' : 'Manage wharf availability and anchorage requests'}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center"
        >
          {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* SECTION 1: Pending Anchorage Requests */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Inbox className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {isRTL ? 'طلبات الرسو المعلقة' : 'Pending Anchorage Requests'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {isRTL ? 'انقر على طلب لمراجعة التفاصيل وتعيين الرصيف' : 'Review and assign a wharf or place on waitlist'}
              </p>
            </div>
          </div>
          {pendingRequests.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingRequests.length} {isRTL ? 'طلب' : 'pending'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري التحميل...' : 'Loading...'} />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-500 dark:text-slate-400">{isRTL ? 'لا توجد طلبات معلقة' : 'No pending requests — all clear!'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-5">
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/25 -m-1 p-2 rounded-lg transition-colors"
                  onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                      <Ship className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-900 dark:text-slate-50 font-semibold">{request.vessel?.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">#{request.id}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(request.docking_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
                        <span>·</span>
                        <span>{request.duration}h</span>
                        {request.reason && (
                          <>
                            <span>·</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{request.reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {request.vessel?.priority && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(request.vessel.priority)} uppercase tracking-wider`}>
                        {isRTL ? 'الأولوية:' : 'PRIORITY:'} {getPriorityLabel(request.vessel.priority)}
                      </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedRequest === request.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expandedRequest === request.id && (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        {isRTL ? 'السبب / الغرض' : 'Reason / Purpose'}
                      </p>
                      <p className="text-slate-900 dark:text-slate-50 text-sm">
                        {request.vessel?.priority_reason || request.vessel?.purpose || request.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${availableWharves.length === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {availableWharves.length === 0
                          ? (isRTL ? 'لا تتوفر أرصفة حالياً.' : 'No wharves currently available.')
                          : `${availableWharves.length} ${isRTL ? 'رصيف متاح' : 'wharf(s) available'}: ${availableWharves.map(w => w.name).join(', ')}`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Row 1: Wharf Selector + Approve */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedWharfMap[request.id] || ''}
                          onChange={(e) => setSelectedWharfMap((prev) => ({ ...prev, [request.id]: Number(e.target.value) }))}
                          disabled={availableWharves.length === 0}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:opacity-40 transition-colors"
                        >
                          <option value="">{isRTL ? '-- اختر رصيفاً --' : '-- Select Wharf --'}</option>
                          {availableWharves.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={!selectedWharfMap[request.id] || processing === request.id}
                          className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
                        >
                          {processing === request.id ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-4 h-4" />}
                          {isRTL ? 'تعيين رصيف' : 'Approve & Assign'}
                        </button>
                      </div>
                      {/* Row 2: Hold / Waitlist + Simple Manifest */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleWaitlist(request)}
                          disabled={processing === request.id}
                          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Clock className="w-4 h-4" />
                          {isRTL ? 'وضع في قائمة الانتظار' : 'Hold / Waitlist'}
                        </button>
                        <button
                          onClick={() => openManifest(null, request.vessel?.name, request.vessel?.containers)}
                          className="flex-1 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {isRTL ? 'بيان مبسط' : 'Simple Manifest'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'الطلبات المعالجة' : 'Processed Requests'}</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {processedRequests.map((req) => (
              <div key={req.id}>
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors duration-200">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${
                      req.status === 'wharf_assigned' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-900/30' :
                      req.status === 'left_wharf' || req.status === 'departed' ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
                      'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-900/30'
                    }`}>
                      <Ship className={`w-4 h-4 ${
                        req.status === 'wharf_assigned' ? 'text-blue-700 dark:text-blue-400' : 
                        req.status === 'left_wharf' || req.status === 'departed' ? 'text-slate-400 dark:text-slate-500' :
                        'text-amber-700 dark:text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-slate-50 font-medium text-sm">{req.vessel?.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {new Date(req.docking_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US')} · {req.duration}h
                        {req.wharf && ` · ${req.wharf.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {req.status === 'wharf_assigned' && checkTimeout(req) && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${
                        checkTimeout(req)?.isExpired 
                          ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 ${checkTimeout(req)?.isExpired ? 'animate-pulse' : ''}`} />
                        <span>{checkTimeout(req)?.remainingText}</span>
                      </div>
                    )}
                    
                    {req.status === 'wharf_assigned' && checkTimeout(req)?.isExpired && (
                      <button
                        onClick={() => handleTimeoutNotify(req)}
                        disabled={processing === req.id || req.timeout_notified_at !== null}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                          req.timeout_notified_at 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {req.timeout_notified_at 
                          ? (isRTL ? 'تم التنبيه' : 'Notified') 
                          : (isRTL ? 'تنبيه انتهاء الوقت' : 'Wharf Timeout')}
                      </button>
                    )}

                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      req.status === 'wharf_assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      req.status === 'waiting' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      req.status === 'left_wharf' || req.status === 'departed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {req.status === 'wharf_assigned' ? (isRTL ? 'رصيف معين' : 'Wharf Assigned') :
                       req.status === 'waiting' ? (isRTL ? 'قائمة انتظار' : 'Waitlisted') : 
                       (req.status === 'left_wharf' || req.status === 'departed') ? (isRTL ? 'غادرت الميناء' : 'Departed') :
                       req.status}
                    </span>
                    {req.status === 'waiting' && (
                      <button
                        onClick={() => setExpandedWaitingId(expandedWaitingId === req.id ? null : req.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedWaitingId === req.id ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {req.status === 'waiting' && expandedWaitingId === req.id && (
                  <div className="px-6 pb-5 pt-1">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {isRTL ? 'إعادة جدولة من قائمة الانتظار' : 'Reschedule from Waitlist'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={selectedWharfMap[req.id] || ''}
                          onChange={(e) => setSelectedWharfMap((prev) => ({ ...prev, [req.id]: Number(e.target.value) }))}
                          disabled={availableWharves.length === 0}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:opacity-40 transition-colors"
                        >
                          <option value="">{isRTL ? '-- اختر رصيفاً --' : '-- Select Wharf --'}</option>
                          {availableWharves.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={!selectedWharfMap[req.id] || processing === req.id}
                          className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
                        >
                          {processing === req.id ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-4 h-4" />}
                          {isRTL ? 'تعيين رصيف' : 'Approve & Assign'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Wharf Status Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{isRTL ? 'حالة الأرصفة' : 'Wharf Status'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center">
              <LoadingIndicator type="line-spinner" size="lg" />
            </div>
          ) : wharves.map((wharf) => (
            <div key={wharf.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{wharf.name}</h3>
                <Anchor className={`w-6 h-6 ${
                  wharf.status === 'available' ? 'text-green-600 dark:text-green-400' :
                  wharf.status === 'maintenance' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <div className="mb-4">
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{isRTL ? 'الحالة' : 'Status'}</p>
                <div className="flex flex-col gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${getWharfStatusBadge(wharf.status)}`}>
                    {getWharfStatusLabel(wharf.status)}
                  </span>
                  {wharf.status === 'occupied' && wharf.vessels && wharf.vessels.length > 0 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 border border-blue-100 dark:border-blue-900/30">
                      <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 truncate">
                        {wharf.vessels[0].name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleMaintenance(wharf)}
                  disabled={processing === wharf.id || wharf.status === 'occupied'}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    wharf.status === 'maintenance'
                      ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white'
                      : 'bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 text-white'
                  }`}
                >
                  {processing === wharf.id ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> :
                    wharf.status === 'maintenance' ? (isRTL ? 'إتاحة' : 'Set Available') : (isRTL ? 'صيانة' : 'Maintenance')}
                </button>
                {wharf.status === 'occupied' && (() => {
                  const hasPendingContainers = wharf.vessels?.[0]?.containers?.some(c => c.status === 'pending') ?? false;
                  return (
                  <>
                    <button
                      onClick={() => toggleOccupied(wharf)}
                      disabled={processing === wharf.id || hasPendingContainers}
                      title={hasPendingContainers ? (isRTL ? 'لا يمكن التحرير حتى يتم تفريغ جميع الحاويات' : 'Cannot release until all containers are physically discharged') : ''}
                      className="flex-1 py-2 rounded-lg font-medium text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processing === wharf.id ? <LoadingIndicator type="line-spinner" size="xs" /> : (isRTL ? 'تحرير الرصيف' : 'Release Wharf')}
                    </button>
                    <button
                      onClick={() => openManifest(
                        wharf.vessels?.[0]?.id ?? null,
                        wharf.vessels?.[0]?.name ?? wharf.name,
                        wharf.vessels?.[0]?.containers ?? []
                      )}
                      className="px-3 py-2 rounded-lg font-medium text-sm border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1.5"
                      title={isRTL ? 'بيان مبسط' : 'Simple Manifest'}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden lg:inline text-xs">{isRTL ? 'بيان مبسط' : 'Manifest'}</span>
                    </button>
                  </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* ── Simple Manifest Modal ─────────────────────────────────────── */}
      {manifestVessel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setManifestVessel(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {isRTL ? 'البيان المبسط' : 'Simple Manifest'}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    <Ship className="w-3 h-3 inline mr-1" />
                    {manifestVessel.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManifestVessel(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Container list */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {manifestVessel.containers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <Box className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{isRTL ? 'لا توجد حاويات مسجلة لهذه السفينة' : 'No containers registered for this vessel'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {manifestVessel.containers.length} {isRTL ? 'حاوية' : 'containers'}
                    </p>
                    {manifestVessel.id && pendingContainersInManifest.length > 0 && (
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700"
                        />
                        {isRTL ? 'تحديد الكل' : 'Select All'}
                      </label>
                    )}
                  </div>
                  {manifestVessel.containers.map((c, i) => {
                    const isPending = c.status === 'pending';
                    const isSelected = selectedContainers.includes(c.id);
                    return (
                    <div
                      key={c.id ?? i}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                        !isPending ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-70' :
                        isSelected ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer'
                      }`}
                      onClick={() => manifestVessel.id && isPending && handleContainerToggle(c.id)}
                    >
                      {manifestVessel.id ? (
                        <div className="flex-shrink-0 flex items-center justify-center w-6">
                          {!isPending ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleContainerToggle(c.id)}
                              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 pointer-events-none"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="w-6 h-6 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug truncate ${!isPending ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-slate-50'}`}>
                          {c.description_of_goods || (isRTL ? 'غير محدد' : 'Unspecified')}
                        </p>
                        {!isPending && (
                          <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mt-0.5">
                            {isRTL ? 'تم التفريغ' : 'Discharged'}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${storageColor(c.storage_type)}`}>
                        {storageIcon(c.storage_type)}
                        {c.storage_type || 'dry'}
                      </span>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setManifestVessel(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
              
              {manifestVessel.id && pendingContainersInManifest.length > 0 && (
                <button
                  onClick={() => setConfirmDischargeModal(true)}
                  disabled={selectedContainers.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isRTL ? 'إتمام التفريغ' : 'Done'}
                  {selectedContainers.length > 0 && (
                    <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                      {selectedContainers.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Discharge Modal ─────────────────────────────────────── */}
      {confirmDischargeModal && manifestVessel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Box className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                {isRTL ? 'تأكيد التفريغ' : 'Confirm Discharge'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {isRTL
                  ? `هل توافق على تفريغ عدد (${selectedContainers.length}) حاويات من السفينة إلى التخزين؟`
                  : `Do you approve that ${selectedContainers.length} container(s) will be physically discharged from the vessel to storage?`}
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                onClick={() => setConfirmDischargeModal(false)}
                disabled={processing === manifestVessel.id}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDischargeApprove}
                disabled={processing === manifestVessel.id}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {processing === manifestVessel.id ? <LoadingIndicator type="line-spinner" size="sm" /> : (isRTL ? 'تأكيد التفريغ' : 'Approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
