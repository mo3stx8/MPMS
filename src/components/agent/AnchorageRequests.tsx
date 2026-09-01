import { useState, useEffect } from 'react';
import { Anchor, AlertCircle, CheckCircle2, XCircle, Clock, Plus, Calendar, Edit2, Download } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { exportAnchoragePdf } from '../../utils/exportPdf';
import { agentService } from '../../services/agentService';
import { Language } from '../../App';
import { toast } from 'react-toastify';
import { translations } from '../../utils/translations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getTranslatedStatus } from '../../utils/formatters';
import * as z from 'zod';

const anchorageSchema = z.object({
  vesselId: z.string().min(1, { message: 'Please select a vessel' }),
  duration: z.string().min(1, { message: 'Duration is required' }),
  customDuration: z.string().optional(),
  reason: z.string().min(1, { message: 'Reason is required' }),
  dockingTime: z.string().min(1, { message: 'Docking time is required' }),
}).refine((data) => {
  if (data.duration === 'custom' && (!data.customDuration || parseInt(data.customDuration) <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Please enter a valid custom duration in hours',
  path: ['customDuration'],
});

type AnchorageFormData = z.infer<typeof anchorageSchema>;

interface AnchorageRequestsProps {
  language: Language;
}

export function AnchorageRequests({ language }: AnchorageRequestsProps) {
  const t = translations[language]?.agent?.anchorage || translations.en.agent.anchorage;
  const [showForm, setShowForm] = useState(false);
  const [approvedVessels, setApprovedVessels] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AnchorageFormData>({
    resolver: zodResolver(anchorageSchema),
    defaultValues: {
      vesselId: '',
      duration: '',
      customDuration: '',
      reason: '',
      dockingTime: '',
    },
  });

  const watchedVesselId = watch('vesselId');
  const watchedDuration = watch('duration');

  // Auto-populate Reason from the selected vessel's purpose/arrival data
  useEffect(() => {
    if (watchedVesselId && !editingId) {
      const selected = approvedVessels.find((v) => v.id.toString() === watchedVesselId);
      if (selected?.purpose) {
        setValue('reason', selected.purpose, { shouldValidate: false });
      }
    }
  }, [watchedVesselId, approvedVessels, editingId, setValue]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vesselsData, requestsData] = await Promise.all([
        agentService.getVessels(),
        agentService.getAnchorageRequests(),
      ]);
      
      // Get IDs of vessels that already have an anchorage request
      const vesselsWithRequests = new Set(requestsData.map((r: any) => r.vessel_id));

      // Filter: Approved arrival status AND not already requested anchorage
      const approved = vesselsData.filter((v: any) => 
        v.status === 'approved' && !vesselsWithRequests.has(v.id)
      );
      
      setApprovedVessels(approved);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching anchorage data', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AnchorageFormData) => {
    try {
      if (editingId) {
        await agentService.updateAnchorageRequest(editingId, {
          vessel_id: data.vesselId,
          duration: data.duration,
          reason: data.reason,
          docking_time: data.dockingTime,
        });
        toast.success(language === 'ar' ? 'تم تعديل الرسو بنجاح!' : 'Anchorage request updated successfully!');
      } else {
        const durationValue = data.duration === 'custom' ? data.customDuration : data.duration;
        await agentService.submitAnchorageRequest({
          vessel_id: data.vesselId,
          duration: durationValue,
          reason: data.reason,
          docking_time: data.dockingTime,
        });
        toast.success(language === 'ar' ? 'تم إرسال طلب الرسو بنجاح!' : 'Anchorage request submitted successfully!');
      }
      setShowForm(false);
      reset();
      setEditingId(null);
      fetchData();
    } catch (error: any) {
      console.error('Submission failed', error);
      if (error.response?.data?.errors) {
        Object.values(error.response.data.errors).forEach((err: any) => toast.error(err[0]));
      } else {
        toast.error(language === 'ar' ? 'فشل إرسال الطلب' : 'Submission failed');
      }
    }
  };

  const handleEdit = (request: any) => {
    setEditingId(request.id);
    reset({
      vesselId: request.vessel_id?.toString() || '',
      duration: request.duration?.toString() || '',
      reason: request.reason || '',
      dockingTime: request.docking_time ? new Date(request.docking_time).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'status-success';
      case 'wharf_assigned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'rejected':
        return 'status-danger';
      case 'waiting':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'pending':
        return 'status-warning';
      case 'cancelled':
        return 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-secondary';
      default:
        return 'status-info';
    }
  };

  const getStatusLabel = (status: string) => {
    return getTranslatedStatus(status, language);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'wharf_assigned':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-danger" />;
      case 'waiting':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-warning animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-info" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8 group">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500 cursor-default">
            {t.title}
          </h1>
          <p className="text-[var(--text-secondary)] font-medium">{t.subtitle}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingId(null); reset(); setShowForm(true); }}
            disabled={approvedVessels.length === 0}
            className="btn-primary"
          >
            <Plus className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
            {t.submitNew}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[var(--bg-primary)] rounded-3xl border border-secondary p-8 mb-8 shadow-2xl animate-in fade-in zoom-in duration-500">
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Anchor className="w-6 h-6 text-primary" />
            {editingId ? (language === 'ar' ? 'تعديل طلب الرسو' : 'Edit Anchorage Request') : t.formTitle}
          </h2>

          <div className="alert-warning mb-8">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold mb-1">{t.dependencyTitle}</h3>
              <p className="text-sm font-medium opacity-90">{t.dependencyMessage}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Select Vessel */}
              <div className="space-y-2">
                <label className="block text-[var(--text-primary)] text-sm font-black uppercase tracking-widest">{t.selectVessel}</label>
                <select
                  {...register('vesselId')}
                  className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.vesselId ? 'border-danger' : 'border-secondary'} rounded-2xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary transition-all [&>option]:bg-[var(--bg-primary)]`}
                >
                  <option value="">{t.selectVesselPlaceholder}</option>
                  {approvedVessels.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {errors.vesselId && <p className="text-danger text-xs font-bold mt-1">{errors.vesselId.message}</p>}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="block text-[var(--text-primary)] text-sm font-black uppercase tracking-widest">{t.duration}</label>
                  <select
                    {...register('duration')}
                    className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.duration ? 'border-danger' : 'border-secondary'} rounded-2xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary transition-all [&>option]:bg-[var(--bg-primary)]`}
                  >
                    <option value="">{t.selectDuration}</option>
                    <option value="24">24 {t.hours}</option>
                    <option value="48">48 {t.hours}</option>
                    <option value="72">72 {t.hours}</option>
                    <option value="custom">{t.custom}</option>
                  </select>
                  {errors.duration && <p className="text-danger text-xs font-bold mt-1">{errors.duration.message}</p>}
                  
                  {watchedDuration === 'custom' && (
                    <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
                        {language === 'ar' ? 'ساعات مخصصة' : 'Enter custom hours'}
                      </label>
                      <input
                        type="number"
                        {...register('customDuration')}
                        placeholder="e.g. 12"
                        className={`w-full px-4 py-2 bg-[var(--background)] border ${errors.customDuration ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                      />
                      {errors.customDuration && <p className="text-danger text-xs font-bold mt-1">{errors.customDuration.message}</p>}
                    </div>
                  )}
              </div>

              {/* Docking Time — full width left column */}
              <div className="space-y-2">
                <label className="block text-[var(--text-primary)] text-sm font-black uppercase tracking-widest">
                  {language === 'ar' ? 'وقت الرسو' : 'Docking Time'}
                </label>
                <input
                  type="datetime-local"
                  {...register('dockingTime')}
                  className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.dockingTime ? 'border-danger' : 'border-secondary'} rounded-2xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary transition-all dark-calendar-icon`}
                />
                {errors.dockingTime && <p className="text-danger text-xs font-bold mt-1">{errors.dockingTime.message}</p>}
              </div>

              {/* Reason — auto-populated from arrival, remains editable */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[var(--text-primary)] text-sm font-black uppercase tracking-widest">{t.reason}</label>
                  {watchedVesselId && approvedVessels.find((v) => v.id.toString() === watchedVesselId)?.purpose && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {language === 'ar' ? 'تم التعبئة تلقائياً' : 'Auto-filled from arrival'}
                    </span>
                  )}
                </div>
                <textarea
                  {...register('reason')}
                  placeholder={t.reasonPlaceholder}
                  rows={3}
                  className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.reason ? 'border-danger' : 'border-secondary'} rounded-2xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none`}
                />
                {errors.reason && <p className="text-danger text-xs font-bold mt-1">{errors.reason.message}</p>}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-4">
                {isSubmitting
                  ? <LoadingIndicator type="line-spinner" size="xs" label={language === 'ar' ? 'جاري الإرسال...' : 'Submitting...'} className="text-white" />
                  : editingId ? (language === 'ar' ? 'تحديث' : 'Update') : t.submitButton}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); setEditingId(null); }}
                className="btn-secondary px-8 py-4"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <LoadingIndicator 
              type="line-spinner" 
              size="lg" 
              label={language === 'ar' ? 'جاري مزامنة بيانات الرسو...' : 'Synchronizing anchorage data...'} 
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-secondary rounded-3xl bg-[var(--bg-primary)]/50">
            <Anchor className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold text-[var(--text-secondary)]">
              {language === 'ar' ? 'لا توجد طلبات رسو.' : 'No anchorage requests found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-[var(--bg-primary)] rounded-3xl border border-secondary p-6 card-interaction group relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                      <Anchor className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[var(--text-primary)] font-black text-xl mb-1 group-hover:text-primary transition-colors">
                        {request.vessel?.name || 'Unknown Vessel'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-secondary rounded-lg text-[var(--text-secondary)] text-[10px] font-black font-mono">#{request.id}</span>
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-5 py-2 rounded-2xl text-xs font-black border-2 shadow-sm ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                    {request.status === 'pending' && (
                      <button onClick={() => handleEdit(request)} className="btn-ghost p-2" title={language === 'ar' ? 'تعديل' : 'Edit'}>
                        <Edit2 className="w-5 h-5 text-primary" />
                      </button>
                    )}
                    <button
                      onClick={() => exportAnchoragePdf(request)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-bold transition-all"
                      title={language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="border border-secondary/50 rounded-2xl p-4 bg-[var(--background)]/50">
                    <div className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-1">{t.duration}</div>
                    <div className="text-[var(--text-primary)] font-black text-lg">{request.duration} <span className="text-xs font-bold opacity-60">HRS</span></div>
                  </div>
                  <div className="border border-secondary/50 rounded-2xl p-4 bg-[var(--background)]/50">
                    <div className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-1">
                      {language === 'ar' ? 'الرصيف المعين' : 'Assigned Wharf'}
                    </div>
                    <div className="text-[var(--text-primary)] font-black text-lg truncate">
                      {request.wharf?.name || (request.status === 'waiting' ? '—' : language === 'ar' ? 'قيد المراجعة' : 'Under Review')}
                    </div>
                  </div>
                  <div className="md:col-span-2 border border-secondary/50 rounded-2xl p-4 bg-[var(--background)]/50">
                    <div className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-1">{t.reason}</div>
                    <div className="text-[var(--text-primary)] font-medium text-sm line-clamp-2">{request.reason || 'N/A'}</div>
                  </div>
                </div>

                {/* Wharf Assigned Banner */}
                {request.status === 'wharf_assigned' && request.wharf && (
                  <div className="mb-8 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-cyan-300 mb-0.5">
                        {language === 'ar' ? 'تم تعيين الرصيف' : 'Wharf Assigned'}
                      </div>
                      <div className="text-xs text-cyan-400/80">
                        {request.wharf.name} · {language === 'ar' ? 'وقت الرسو:' : 'Docking:'} {new Date(request.docking_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting Banner */}
                {request.status === 'waiting' && (
                  <div className="mb-8 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 animate-pulse" />
                    <div>
                      <div className="font-bold text-sm text-orange-300 mb-0.5">
                        {language === 'ar' ? 'في قائمة الانتظار' : 'On Waitlist'}
                      </div>
                      <div className="text-xs text-orange-400/80">{request.rejection_reason}</div>
                    </div>
                  </div>
                )}

                {/* Rejection Banner */}
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="alert-danger mb-8">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm mb-1 uppercase tracking-widest">Rejection Reason</div>
                      <div className="text-sm font-medium opacity-90">{request.rejection_reason}</div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="pt-6 border-t border-secondary/30">
                  <h4 className="text-[var(--text-primary)] font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t.approvalProcess}
                  </h4>
                  <div className="flex items-center gap-6 flex-wrap">
                    {/* Step 1: Submitted */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-success/10 border-2 border-success shadow-sm shadow-success/20">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <div className="text-[var(--text-primary)] font-black text-xs">{language === 'ar' ? 'تم التقديم' : 'Submitted'}</div>
                        <div className="text-[var(--text-secondary)] text-[10px] font-bold">{new Date(request.created_at).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex-1 border-t-2 border-dashed border-secondary min-w-8" />

                    {/* Step 2: Wharf Review */}
                    <div className={`flex items-center gap-3 ${request.status === 'pending' ? 'opacity-50' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${
                        request.status === 'wharf_assigned' ? 'bg-cyan-500/10 border-cyan-500' :
                        request.status === 'waiting' ? 'bg-orange-500/10 border-orange-500' :
                        request.status === 'pending' ? 'bg-[var(--background)] border-secondary border-dashed' :
                        'bg-success/10 border-success'
                      }`}>
                        {getStatusIcon(request.status)}
                      </div>
                      <div>
                        <div className="font-black text-xs text-[var(--text-primary)]">
                          {request.status === 'wharf_assigned' ? (language === 'ar' ? 'رصيف معين' : 'Wharf Assigned') :
                           request.status === 'waiting' ? (language === 'ar' ? 'قائمة انتظار' : 'Waitlisted') :
                           request.status === 'pending' ? (language === 'ar' ? 'بانتظار المراجعة' : 'Awaiting Wharf Review') :
                           (language === 'ar' ? 'مقبول' : 'Approved')}
                        </div>
                        {request.wharf_assigned_at && (
                          <div className="text-[var(--text-secondary)] text-[10px] font-bold">{new Date(request.wharf_assigned_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
