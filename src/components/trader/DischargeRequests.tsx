import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Language } from '../../App';
import { FileText, Package, Calendar, CheckCircle2, XCircle, Clock, RefreshCw, Send, Ship, CheckSquare, ChevronDown, ChevronUp, FlaskConical, ThermometerSnowflake, Box } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { traderService } from '../../services/traderService';
import api from '../../services/api';
import { exportDischargeRequestPdf } from '../../utils/exportPdf';

interface DischargeRequestsProps {
  language: Language;
  userEmail: string;
  userName: string;
}

interface ContainerData {
  id: number;
  vessel_id: number;
  manifest_file_path: string;
  port_of_loading: string;
  arrival_date: string;
  description_of_goods: string;
  storage_type: 'chemical' | 'frozen' | 'dry';
  status: string;
  location?: string;
  vessel?: {
    id: number;
    name: string;
  };
}

interface VesselData {
  id: number;
  name: string;
  status: string;
  containers: ContainerData[];
}

interface DischargeRequestBatch {
  batch_id: string;
  vessel?: { name: string };
  status: string;
  requested_date: string;
  rejection_reason?: string;
  containers: ContainerData[];
  created_at: string;
}

export function DischargeRequests({ language, userEmail }: DischargeRequestsProps) {
  const isRTL = language === 'ar';
  const [batches, setBatches] = useState<DischargeRequestBatch[]>([]);
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedVesselId, setSelectedVesselId] = useState<number | ''>('');
  const [selectedContainerIds, setSelectedContainerIds] = useState<number[]>([]);
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatchId(prev => prev === batchId ? null : batchId);
  };

  const getStorageIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'chemical': return <FlaskConical className="w-3.5 h-3.5 text-amber-500" />;
      case 'frozen': return <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-500" />;
      default: return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get my vessels with containers
      const vesselsRes = await api.get('/trader/my-containers');
      setVessels(vesselsRes.data);

      // Get discharge requests — already grouped by batch_id from the API
      const batchesData = await traderService.getDischargeRequests();
      setBatches(batchesData);
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل بيانات طلبات التفريغ' : 'Failed to load discharge requests data');
      console.error('Error loading discharge requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  const selectedVessel = useMemo(() => {
    if (!selectedVesselId) return null;
    return vessels.find(v => v.id === selectedVesselId) || null;
  }, [selectedVesselId, vessels]);

  const eligibleContainers = useMemo(() => {
    if (!selectedVessel) return [];
    // Only allow requesting discharge for containers that are physically in the storage ('discharged')
    const eligible = selectedVessel.containers.filter(c => {
      const s = c.status?.toLowerCase() || '';
      return s === 'discharged';
    });
    return eligible;
  }, [selectedVessel]);

  const toggleContainerSelection = (id: number) => {
    setSelectedContainerIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContainerIds(eligibleContainers.map(c => c.id));
    } else {
      setSelectedContainerIds([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVesselId || selectedContainerIds.length === 0 || !requestedDate) {
      toast.warning(isRTL ? 'يرجى اختيار سفينة وحاوية واحدة على الأقل وتاريخ التفريغ' : 'Please select a vessel, at least one container, and the requested date');
      return;
    }

    setSubmitting(true);
    try {
      await traderService.requestDischarge(selectedVesselId as number, selectedContainerIds, requestedDate, notes);
      toast.success(isRTL ? 'تم تقديم الطلب بنجاح' : 'Request submitted successfully');
      setShowForm(false);

      setSelectedVesselId('');
      setSelectedContainerIds([]);
      setRequestedDate('');
      setNotes('');
      await loadData();
    } catch (error) {
      console.error('Error submitting discharge request:', error);
      toast.error(isRTL ? 'حدث خطأ أثناء تقديم الطلب' : 'Error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: isRTL ? 'قيد الانتظار' : 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
      case 'approved':
        return { label: isRTL ? 'موافق عليه' : 'Approved', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'rejected':
      case 'declined':
        return { label: isRTL ? 'مرفوض' : 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      default:
        return { label: status, icon: Clock, className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 bg-[var(--bg-primary)] min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {isRTL ? 'طلبات التفريغ' : 'Discharge Requests'}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
            {isRTL ? 'تقديم ومتابعة طلبات تفريغ الحاويات المجمعة' : 'Submit and track grouped container discharge requests'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="border border-secondary/30 text-[var(--text-primary)] hover:bg-secondary/10 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center"
          >
            {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
            <span className="text-sm">{isRTL ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">{isRTL ? 'طلب جديد' : 'New Request'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">{isRTL ? 'إجمالي الطلبات' : 'Total Requests'}</div>
          <div className="text-4xl font-black text-[var(--text-primary)]">{batches.length}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">{isRTL ? 'قيد الانتظار' : 'Pending'}</div>
          <div className="text-4xl font-black text-amber-700 dark:text-amber-500">
            {batches.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-2">{isRTL ? 'موافق عليها' : 'Approved'}</div>
          <div className="text-4xl font-black text-green-700 dark:text-green-500">
            {batches.filter(r => r.status === 'approved').length}
          </div>
        </div>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-8 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            {isRTL ? 'تقديم طلب تفريغ جديد' : 'Submit New Discharge Request'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">
                  {isRTL ? 'السفينة' : 'Vessel'}
                </label>
                <select
                  value={selectedVesselId}
                  onChange={(e) => {
                    setSelectedVesselId(Number(e.target.value));
                    setSelectedContainerIds([]); // reset selection
                  }}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-secondary/30 rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">
                    {vessels.some(v => v.status === 'departed' || (v.containers && v.containers.length > 0 && v.containers.every(c => c.status?.toLowerCase() === 'discharged')))
                      ? (isRTL ? 'اختر سفينة...' : 'Choose vessel...')
                      : (isRTL ? 'لا توجد سفن مؤهلة بعد' : 'No eligible vessels available yet')}
                  </option>
                  {vessels.filter(v => v.status === 'departed' || (v.containers && v.containers.length > 0 && v.containers.every(c => c.status?.toLowerCase() === 'discharged'))).map(v => {
                    const eligibleCount = v.containers.filter(c =>
                      ['discharged'].includes(c.status?.toLowerCase())
                    ).length;

                    if (eligibleCount === 0) return null;

                    return (
                      <option key={v.id} value={v.id}>
                        {v.name} - ({eligibleCount} {isRTL ? 'حاويات جاهزة' : 'eligible containers'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">
                  {isRTL ? 'تاريخ التفريغ المطلوب' : 'Requested Discharge Date'}
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-secondary/30 rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {selectedVesselId && (
              <div className="bg-[var(--bg-primary)]/50 p-6 rounded-xl border border-secondary/20 animate-in fade-in">
                <div className="flex justify-between items-center mb-4 border-b border-secondary/10 pb-4">
                  <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Ship className="w-5 h-5 text-indigo-500" />
                    {isRTL ? 'الحاويات المتاحة للتفريغ' : 'Available Containers for Discharge'}
                  </h3>
                  {eligibleContainers.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-secondary/30 text-blue-600 focus:ring-blue-500"
                        checked={selectedContainerIds.length === eligibleContainers.length && eligibleContainers.length > 0}
                        onChange={handleSelectAll}
                      />
                      {isRTL ? 'تفريغ الكل' : 'Discharge All'}
                    </label>
                  )}
                </div>

                {eligibleContainers.length === 0 ? (
                  <p className="text-amber-600 dark:text-amber-400 text-sm font-medium p-4 bg-amber-500/10 rounded-lg text-center">
                    {isRTL ? 'لا توجد حاويات مؤهلة للتفريغ لهذه السفينة حالياً.' : 'No eligible containers for discharge currently available for this vessel.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto pr-2">
                    {eligibleContainers.map(container => (
                      <label key={container.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedContainerIds.includes(container.id) ? 'border-blue-500 bg-blue-500/5 shadow-sm' : 'border-secondary/20 hover:border-blue-500/50 bg-[var(--card)]'}`}>
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-secondary/30 text-blue-600 focus:ring-blue-500"
                          checked={selectedContainerIds.includes(container.id)}
                          onChange={() => toggleContainerSelection(container.id)}
                        />
                        <div>
                          <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                            ID: {container.id.toString().padStart(6, '0')}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                            {container.description_of_goods}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">
                {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={isRTL ? 'أدخل أي ملاحظات إضافية...' : 'Enter any additional notes...'}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-secondary/30 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting || selectedContainerIds.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {submitting ? (
                  <>
                    <LoadingIndicator type="line-spinner" size="xs" className="text-white" />
                    <span>{isRTL ? 'جاري التقديم...' : 'Submitting...'}</span>
                  </>
                ) : (isRTL ? 'تقديم الطلب' : 'Submit Request')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-secondary/30 text-[var(--text-primary)] hover:bg-secondary/10 px-6 py-3 rounded-xl font-bold transition-colors duration-200"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-20 text-center shadow-sm">
          <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري التحميل...' : 'Loading requests...'} />
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-20 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-50" />
          </div>
          <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">
            {isRTL ? 'لا توجد طلبات' : 'No Requests'}
          </h3>
          <p className="text-[var(--text-secondary)] font-medium max-w-md mx-auto mb-8">
            {isRTL ? 'لم تقم بتقديم أي طلبات تفريغ بعد' : 'You haven\'t submitted any discharge requests yet'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"
          >
            {isRTL ? 'تقديم طلب جديد' : 'Submit New Request'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {batches.map(batch => {
            const statusBadge = getStatusBadge(batch.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={batch.batch_id}
                className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-6 shadow-sm hover:border-blue-500/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-6 border-b border-secondary/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Ship className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--text-primary)]">
                        {batch.vessel?.name || 'Unknown Vessel'}
                      </h3>
                      <p className="text-[var(--text-secondary)] font-mono text-xs mt-1 uppercase tracking-wider">
                        {isRTL ? 'رقم الدفعة:' : 'Batch ID:'} {batch.batch_id}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${statusBadge.className}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusBadge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-4 bg-[var(--bg-primary)]/50 p-4 rounded-xl border border-secondary/10">
                    <div className="bg-indigo-500/10 p-2.5 rounded-lg">
                      <Package className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider mb-0.5">{isRTL ? 'عدد الحاويات' : 'Containers'}</div>
                      <div className="text-[var(--text-primary)] font-black text-lg">{batch.containers.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[var(--bg-primary)]/50 p-4 rounded-xl border border-secondary/10">
                    <div className="bg-teal-500/10 p-2.5 rounded-lg">
                      <Calendar className="w-5 h-5 text-teal-500" />
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider mb-0.5">{isRTL ? 'تاريخ التفريغ المطلوب' : 'Requested Date'}</div>
                      <div className="text-[var(--text-primary)] font-black text-lg">{formatDate(batch.requested_date)}</div>
                    </div>
                  </div>
                </div>

                {batch.status === 'declined' && batch.rejection_reason && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-red-500 font-bold text-sm mb-1 uppercase tracking-wider">
                        {isRTL ? 'سبب الرفض' : 'Rejection Reason'}
                      </div>
                      <div className="text-red-600 dark:text-red-400 font-medium text-sm">{batch.rejection_reason}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[var(--text-secondary)] text-xs font-medium">
                  <div>
                    {isRTL ? 'تم التقديم:' : 'Submitted:'} {formatDate(batch.created_at)}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDischargeRequestPdf(batch as any, 'trader');
                      }}
                      className="flex items-center gap-1.5 text-orange-600 hover:text-orange-500 font-bold transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      {isRTL ? 'تصدير PDF' : 'Export PDF'}
                    </button>
                    <button
                      onClick={() => toggleBatchExpand(batch.batch_id)}
                      className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 font-bold transition-colors cursor-pointer"
                    >
                      {expandedBatchId === batch.batch_id
                        ? (isRTL ? 'إخفاء الحاويات ↑' : 'Hide Containers')
                        : (isRTL ? 'عرض الحاويات →' : 'View Containers →')}
                      {expandedBatchId === batch.batch_id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Containers Panel */}
                {expandedBatchId === batch.batch_id && (
                  <div className="mt-4 pt-4 border-t border-secondary/10 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-3">
                      {isRTL ? `الحاويات المشمولة (${batch.containers.length})` : `Included Containers (${batch.containers.length})`}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {batch.containers.filter(Boolean).map(c => (
                        <div
                          key={c.id}
                          className="bg-[var(--bg-primary)]/60 border border-secondary/15 rounded-xl p-4 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                              #{c.id?.toString().padStart(5, '0')}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-[var(--text-secondary)] capitalize">
                              {getStorageIcon(c.storage_type)}
                              {c.storage_type}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)] leading-snug line-clamp-2">
                            {c.description_of_goods || '—'}
                          </p>
                          {c.location && (
                            <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                              📍 {c.location}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
