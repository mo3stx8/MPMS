import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Language } from '../../App';
import { Anchor, Ship, AlertTriangle, CheckCircle, Calendar, Clock, Inbox, RefreshCw } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { getVessels, getWharves, assignBerth, Vessel, Wharf, getScheduledAnchorage, ScheduledAnchorage } from '../../utils/portOfficerApi';

interface BerthingManagementProps {
  language: Language;
}

export function BerthingManagement({ language }: BerthingManagementProps) {
  const isRTL = language === 'ar';

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [wharves, setWharves] = useState<Wharf[]>([]);
  const [scheduledAnchorage, setScheduledAnchorage] = useState<ScheduledAnchorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [selectedWharf, setSelectedWharf] = useState<Wharf | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [etaInput, setEtaInput] = useState('');
  const [etdInput, setEtdInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [vesselsData, wharvesData, anchorageData] = await Promise.all([getVessels(), getWharves(), getScheduledAnchorage()]);
      setVessels(vesselsData);
      setWharves(wharvesData);
      setScheduledAnchorage(anchorageData);
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل بيانات الجدولة' : 'Failed to load scheduling data');
      console.error('Error loading berthing data:', error);
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedVessel && selectedVessel.arrival) {
      try {
        const d = new Date(selectedVessel.arrival);
        if (!isNaN(d.getTime())) setEtaInput(d.toISOString().slice(0, 16));
      } catch (e) {}
    } else {
      setEtaInput('');
    }
    setEtdInput('');
  }, [selectedVessel]);

  const handleAssignBerth = () => {
    if (!selectedVessel || !selectedWharf || !etaInput || !etdInput) return;
    if (new Date(etaInput) >= new Date(etdInput)) {
      setConflictMessage(isRTL ? 'يجب أن يكون وقت المغادرة بعد وقت الوصول' : 'Departure time must be after arrival time.');
      setShowConflictWarning(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAssignment = async () => {
    if (!selectedVessel || !selectedWharf || assigning) return;
    setAssigning(true);
    try {
      const etaISO = new Date(etaInput).toISOString();
      const etdISO = new Date(etdInput).toISOString();
      await assignBerth(selectedVessel.id, selectedWharf.id, etaISO, etdISO, 'Port Officer');
      toast.success(isRTL ? 'تم تعيين الرصيف بنجاح!' : 'Berth assigned successfully!');
      await loadData();
      setShowConfirmModal(false);

      setSelectedVessel(null);
      setSelectedWharf(null);
      setEtaInput('');
      setEtdInput('');
    } catch (error: any) {
      console.error('Error assigning berth:', error);
      if (error.response?.data?.message) {
        setConflictMessage(error.response.data.message);
        setShowConfirmModal(false);
        setShowConflictWarning(true);
      } else {
        toast.error(isRTL ? 'فشل تعيين الرصيف' : 'Failed to assign berth');
      }
    } finally {

      setAssigning(false);
    }
  };

  const awaitingVessels = vessels.filter(v => v.status === 'awaiting');

  const now = new Date();
  const timelineStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timelineEnd = new Date(timelineStart.getTime() + 48 * 60 * 60 * 1000);
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

  const getPositionStyle = (arrival?: string, departure?: string) => {
    if (!arrival || !departure) return { display: 'none' };
    const start = new Date(arrival).getTime();
    const end = new Date(departure).getTime();
    const renderStart = Math.max(start, timelineStart.getTime());
    const renderEnd = Math.min(end, timelineEnd.getTime());
    if (renderEnd <= renderStart || end < timelineStart.getTime() || start > timelineEnd.getTime()) return { display: 'none' };
    const leftPct = ((renderStart - timelineStart.getTime()) / totalDuration) * 100;
    const widthPct = ((renderEnd - renderStart) / totalDuration) * 100;
    return isRTL ? { right: `${leftPct}%`, width: `${widthPct}%` } : { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحميل البيانات...' : 'Loading data...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{isRTL ? 'جدولة السفن والأرصفة' : 'Ship & Berth Scheduling'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRTL ? 'إدارة المخطط الزمني للسفن وتعيين الأرصفة' : 'Manage Vessel Timeline & Assign Berths'}</p>
        </div>
        <button onClick={loadData} disabled={loading} className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
          {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Scheduled Anchorage Handoffs */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Inbox className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'إسناد طلبات الرسو المقررة' : 'Scheduled Anchorage Handoffs'}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{isRTL ? 'طلبات تم تعيين رصيف لها بواسطة مشرف الرصيف' : 'Approved by Wharf Officer — ready for entry'}</p>
          </div>
          {scheduledAnchorage.length > 0 && (
            <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{scheduledAnchorage.length}</span>
          )}
        </div>

        {scheduledAnchorage.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">{isRTL ? 'لا توجد إسنادات مجدولة حالياً' : 'No scheduled handoffs at the moment'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {scheduledAnchorage.map((item) => (
              <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Ship className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-slate-900 dark:text-slate-50 font-semibold">{item.vessel?.name}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono">IMO: {item.vessel?.imo_number}</span>
                      <span className="flex items-center gap-1"><Anchor className="w-3 h-3" />{item.wharf?.name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.docking_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
                      <span>{item.duration}h</span>
                    </div>
                    {item.reason && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 line-clamp-1">{item.reason}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {isRTL ? 'جاهز للدخول' : 'Ready for Entry'}
                  </span>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1">
                    {isRTL ? 'أُسند:' : 'Assigned:'} {new Date(item.wharf_assigned_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vessels Awaiting Berth */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <Ship className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'سفن تنتظر الجدولة' : 'Vessels Awaiting Schedule'}</h2>
          </div>
          {awaitingVessels.length > 0 ? (
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {awaitingVessels.map((vessel) => (
                <div
                  key={vessel.id}
                  onClick={() => setSelectedVessel(vessel)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVessel?.id === vessel.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-700/25 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-slate-900 dark:text-slate-50 font-medium text-sm">{vessel.name}</h3>
                    {selectedVessel?.id === vessel.id && <CheckCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Ship className="w-3 h-3" />{vessel.type}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />{new Date(vessel.arrival).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Ship className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">{isRTL ? 'لا توجد سفن تنتظر' : 'No vessels awaiting schedule'}</p>
            </div>
          )}
        </div>

        {/* Timeline & Assignment */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'المخطط الزمني للأرصفة (48 ساعة)' : 'Berth Timeline (48 Hours)'}</h2>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[640px]">
                <div className="flex pt-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs">
                  <div className="w-28 flex-shrink-0 font-medium">{isRTL ? 'الرصيف' : 'Wharf'}</div>
                  <div className="flex-1 relative">
                    <div className="absolute left-0 -top-5 transform -translate-x-1/2 text-xs">00:00 (Today)</div>
                    <div className="absolute left-1/2 -top-5 transform -translate-x-1/2 text-xs">00:00 (Tomorrow)</div>
                    <div className="absolute right-0 -top-5 transform translate-x-1/2 text-xs">00:00 (Day 3)</div>
                    <div className="w-full flex justify-between h-2 border-l border-r border-slate-200 dark:border-slate-700 relative">
                      <div className="absolute left-1/4 h-2 border-l border-slate-200 dark:border-slate-700" />
                      <div className="absolute left-1/2 h-4 border-l border-slate-300 dark:border-slate-600 -top-2" />
                      <div className="absolute left-3/4 h-2 border-l border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {wharves.map((wharf) => {
                    const scheduledVessels = vessels.filter(v => v.currentWharf === wharf.name && ['scheduled', 'docked', 'loading', 'unloading'].includes(v.status));
                    const isSelected = selectedWharf?.id === wharf.id;
                    return (
                      <div
                        key={wharf.id}
                        onClick={() => setSelectedWharf(wharf)}
                        className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/25'}`}
                      >
                        <div className="w-28 flex-shrink-0 pr-3">
                          <h4 className={`font-medium text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-50'}`}>{wharf.name}</h4>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{wharf.capacity} DWT</span>
                        </div>
                        <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg relative overflow-hidden border border-slate-200 dark:border-slate-600">
                          {scheduledVessels.map(v => {
                            const style = getPositionStyle(v.arrival, v.departure);
                            const bgClass = (v.status === 'docked' || v.status === 'loading' || v.status === 'unloading')
                              ? 'bg-green-500 dark:bg-green-600'
                              : 'bg-blue-500 dark:bg-blue-600';
                            return (
                              <div
                                key={v.id}
                                className={`absolute h-7 top-1.5 rounded ${bgClass} flex items-center px-2 cursor-help overflow-hidden`}
                                style={style}
                                title={`${v.name} (${new Date(v.arrival).toLocaleString()} - ${new Date(v.departure!).toLocaleString()})`}
                              >
                                <span className="text-white text-xs font-medium truncate select-none">{v.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Panel */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">{isRTL ? 'جدولة رصيف' : 'Schedule Berth'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wider">{isRTL ? 'السفينة المحددة' : 'Selected Vessel'}</p>
                  {selectedVessel ? (
                    <div className="flex items-center justify-between">
                      <p className="text-slate-900 dark:text-slate-50 font-semibold">{selectedVessel.name}</p>
                      <Ship className="w-4 h-4 text-slate-400" />
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic text-sm">{isRTL ? 'اضغط على سفينة في القائمة' : 'Click a vessel from the list'}</p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wider">{isRTL ? 'الرصيف المحدد' : 'Selected Wharf'}</p>
                  {selectedWharf ? (
                    <div className="flex items-center justify-between">
                      <p className="text-slate-900 dark:text-slate-50 font-semibold">{selectedWharf.name}</p>
                      <Anchor className="w-4 h-4 text-slate-400" />
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic text-sm">{isRTL ? 'اضغط على رصيف في المخطط الزمني' : 'Click a wharf from the timeline'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">{isRTL ? 'وقت الوصول المتوقع (ETA)' : 'Estimated Arrival (ETA)'}</label>
                  <input type="datetime-local" value={etaInput} onChange={(e) => setEtaInput(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">{isRTL ? 'وقت المغادرة المتوقع (ETD)' : 'Estimated Departure (ETD)'}</label>
                  <input type="datetime-local" value={etdInput} onChange={(e) => setEtdInput(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors text-sm" />
                </div>
              </div>
            </div>

            <button onClick={handleAssignBerth} disabled={!selectedVessel || !selectedWharf || !etaInput || !etdInput || assigning} className="w-full bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              {assigning ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <Calendar className="w-4 h-4" />}
              {isRTL ? 'تأكيد الجدولة' : 'Confirm Schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Warning Modal */}
      {showConflictWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-400" /></div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'تحذير جدول رصيف' : 'Scheduling Conflict'}</h3>
            </div>
            <p className="text-slate-700 dark:text-slate-300 mb-6">{conflictMessage}</p>
            <button onClick={() => setShowConflictWarning(false)} className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 py-2.5 rounded-lg font-medium transition-colors">
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><CheckCircle className="w-5 h-5 text-blue-700 dark:text-blue-400" /></div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'تأكيد الجدولة' : 'Confirm Schedule'}</h3>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 rounded-lg p-4 mb-5 space-y-3 border border-slate-200 dark:border-slate-700">
              {[
                { label: isRTL ? 'السفينة' : 'Vessel', value: selectedVessel?.name },
                { label: isRTL ? 'الرصيف' : 'Wharf', value: selectedWharf?.name },
                { label: isRTL ? 'وصول' : 'Arrival', value: new Date(etaInput).toLocaleString() },
                { label: isRTL ? 'مغادرة' : 'Departure', value: new Date(etdInput).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between ${i < 3 ? 'pb-2 border-b border-slate-200 dark:border-slate-700' : ''}`}>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{item.label}</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium text-sm">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} disabled={assigning} className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={confirmAssignment} disabled={assigning} className="flex-1 bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                {assigning ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-4 h-4" />}
                {isRTL ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
