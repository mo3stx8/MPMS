import { useState, useEffect } from 'react';
import { Ship, Clock, AlertCircle, CheckCircle2, XCircle, Plus, Loader2, Edit2, UploadCloud, Download } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { exportArrivalPdf } from '../../utils/exportPdf';
import { agentService } from '../../services/agentService';
import { Language } from '../../App';
import { toast } from 'react-toastify';
import { translations } from '../../utils/translations';
import { ManifestUploader } from './ManifestUploader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getTranslatedStatus, getTranslatedVesselType, getManifestStatusLabel } from '../../utils/formatters';
import * as z from 'zod';

const englishRegex = /^[\x20-\x7E\n\r]*$/;
const englishMessage = 'Only English characters are allowed';

// Define Zod schema matching the backend StoreVesselArrivalRequest
const arrivalSchema = z.object({
  imo: z.string().regex(/^\d{7}$/, { message: 'IMO number must be exactly 7 digits' }),
  vessel: z.string().min(1, { message: 'Vessel name is required' }).regex(englishRegex, { message: englishMessage }),
  type: z.string().min(1, { message: 'Vessel type is required' }),
  flag: z.string().min(1, { message: 'Flag is required' }).regex(englishRegex, { message: englishMessage }).optional().or(z.literal('')),
  arrivalDate: z.string().min(1, { message: 'Arrival date is required' }),
  arrivalTime: z.string().min(1, { message: 'Arrival time is required' }),
  purpose: z.string().min(1, { message: 'Purpose is required' }).regex(englishRegex, { message: englishMessage }),
  cargo: z.string().regex(englishRegex, { message: englishMessage }).optional().or(z.literal('')),
  expected_containers: z.coerce.number().min(0, { message: 'Must be 0 or more' }).optional().or(z.literal('')),
  priority: z.enum(['Low', 'Medium', 'High']),
  priority_reason: z.string().regex(englishRegex, { message: englishMessage }).optional().or(z.literal('')),
  priority_document: z.any().optional(),
}).superRefine((data, ctx) => {
  if (data.priority === 'Medium' && (!data.priority_reason || data.priority_reason.length < 20)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reason must be at least 20 characters',
      path: ['priority_reason'],
    });
  }
  if (data.priority === 'High') {
    if (!data.priority_document || data.priority_document.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Priority documentation is required for High priority',
        path: ['priority_document'],
      });
    } else {
      const file = data.priority_document[0] as File;
      if (file && !['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Document must be PDF or JPEG format',
          path: ['priority_document'],
        });
      }
    }
  }
});

type ArrivalFormData = z.infer<typeof arrivalSchema>;

interface ArrivalNotificationsProps {
  language: Language;
}

interface ExitReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vesselName: string;
  exitReason: string;
  setExitReason: (val: string) => void;
  isExiting: boolean;
  t: any;
  language: Language;
}

const ExitReasonModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  vesselName, 
  exitReason, 
  setExitReason, 
  isExiting, 
  t, 
  language 
}: ExitReasonModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-secondary/30 p-8 w-full max-auto max-w-lg shadow-2xl animate-in zoom-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{t.leaveVesselConfirmTitle}</h3>
        </div>

        <div className="space-y-4">
          <p className="text-[var(--text-secondary)] font-medium">
            {language === 'ar' 
              ? `أنت على وشك سحب السفينة ${vesselName}. يرجى ذكر السبب.`
              : `You are about to withdraw vessel ${vesselName}. Please provide a reason.`}
          </p>

          <div>
            <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.leaveVesselReasonLabel}</label>
            <textarea
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder={t.leaveVesselReasonPlaceholder}
              rows={4}
              className="w-full px-4 py-3 bg-[var(--background)] border border-secondary rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onConfirm}
            disabled={isExiting || !exitReason.trim()}
            className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {isExiting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
            {t.leaveVessel}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-secondary/10 hover:bg-secondary/20 text-[var(--text-primary)] font-bold rounded-xl transition-all"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export function ArrivalNotifications({ language }: ArrivalNotificationsProps) {
  const t = translations[language]?.agent?.arrivals || translations.en.agent.arrivals;

  const SESSION_KEY = 'arrival_notification_draft';
  const savedDraft = sessionStorage.getItem(SESSION_KEY);
  const hasDraft = !!savedDraft;
  const initialValues = savedDraft ? JSON.parse(savedDraft) : {
    imo: '',
    vessel: '',
    type: '',
    flag: '',
    arrivalDate: '',
    arrivalTime: '',
    purpose: '',
    cargo: '',
    expected_containers: '',
    priority: 'Low',
    priority_reason: '',
  };

  const [showForm, setShowForm] = useState(hasDraft);
  const [vesselId, setVesselId] = useState<number | null>(null);
  const [imoVerified, setImoVerified] = useState(hasDraft && !!initialValues.vessel); // Optionally auto-verify if vessel data exists
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIMO, setCheckingIMO] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedManifestId, setExpandedManifestId] = useState<number | null>(null);
  const [highlightedImo, setHighlightedImo] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedVesselForExit, setSelectedVesselForExit] = useState<any>(null);
  const [exitReason, setExitReason] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArrivalFormData>({
    resolver: zodResolver(arrivalSchema),
    defaultValues: initialValues,
  });

  const handleEmergencyExit = async () => {
    if (!selectedVesselForExit || !exitReason.trim()) return;

    setIsExiting(true);
    try {
      await agentService.emergencyExit(selectedVesselForExit.id, exitReason);
      toast.success(t.leaveVesselSuccess);
      setShowExitModal(false);
      setExitReason('');
      setSelectedVesselForExit(null);
      loadArrivals();
    } catch (error: any) {
      console.error('Emergency exit error:', error);
      const backendMessage = error.response?.data?.message;
      const backendError = error.response?.data?.error;
      
      const msg = backendMessage || backendError || (language === 'ar' ? 'فشل عملية الخروج' : 'Emergency exit failed');
      toast.error(msg);
    } finally {
      setIsExiting(false);
    }
  };

  useEffect(() => {
    const subscription = watch((value) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const watchImo = watch('imo');
  const watchPriority = watch('priority');
  const watchType = watch('type');

  useEffect(() => {
    loadArrivals();
  }, []);

  useEffect(() => {
    if (!loading && notifications.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const vesselId = urlParams.get('vesselId');
      if (vesselId) {
        setHighlightedImo(vesselId);
        setTimeout(() => {
          const element = document.getElementById(`arrival-notification-${vesselId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        const timeout = setTimeout(() => {
          setHighlightedImo(null);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('vesselId');
          window.history.replaceState({}, '', newUrl);
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [loading, notifications]);

  const loadArrivals = async () => {
    try {
      const data = await agentService.getUpcomingArrivals();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load arrivals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIMO = async () => {
    const rawImo = getValues('imo');
    if (!rawImo || !/^\d{7}$/.test(rawImo)) {
      toast.error('IMO number must be exactly 7 digits');
      return;
    }
    const currentImo = `IMO${rawImo}`;
    setCheckingIMO(true);
    try {
      const result = await agentService.checkIMO(currentImo);
      if (result.found) {
        // If it's an active notification owned by the user, enter Edit mode
        if (result.is_active && result.is_owner) {
          setEditingId(result.vessel.id);
          setVesselId(result.vessel.id);
          toast.info(language === 'ar' 
            ? 'تم العثور على إشعار وصول نشط لهذه السفينة. يمكنك تحديث البيانات الآن.' 
            : 'An active arrival notification exists for this vessel. You can now update its details.');
            
          // Populate ALL fields for the existing notification
          setValue('vessel', result.vessel.name, { shouldValidate: true });
          setValue('type', result.vessel.type, { shouldValidate: true });
          setValue('expected_containers', result.vessel.expected_containers || '', { shouldValidate: true });
          setValue('flag', result.vessel.flag || '', { shouldValidate: true });
          setValue('purpose', result.vessel.purpose || '', { shouldValidate: true });
          setValue('cargo', result.vessel.cargo || '', { shouldValidate: true });
          setValue('priority', result.vessel.priority || 'Low', { shouldValidate: true });
          setValue('priority_reason', result.vessel.priority_reason || '', { shouldValidate: true });
          
          if (result.vessel.eta) {
            const parts = result.vessel.eta.replace('T', ' ').split(' ');
            if (parts.length >= 2) {
              setValue('arrivalDate', parts[0], { shouldValidate: true });
              setValue('arrivalTime', parts[1].substring(0, 5), { shouldValidate: true });
            }
          }
          setImoVerified(true);
        } else if (result.is_active && !result.is_owner) {
          // If active but owned by someone else, block it
          toast.error(language === 'ar'
            ? 'تنبيه: يوجد إشعار وصول نشط لهذه السفينة من قبل وكيل آخر.'
            : 'Warning: An active arrival notification already exists for this vessel by another agent.');
          return;
        } else {
          // Found in history but not active (or rejected/departed)
          // Just populate basic vessel info for a NEW notification
          setImoVerified(true);
          setVesselId(result.vessel.id);
          setEditingId(null);
          setValue('vessel', result.vessel.name, { shouldValidate: true });
          setValue('type', result.vessel.type, { shouldValidate: true });
          setValue('expected_containers', result.vessel.expected_containers || '', { shouldValidate: true });
          setValue('flag', result.vessel.flag || '', { shouldValidate: true });
        }
      } else {
        setImoVerified(true);
        setVesselId(null);
        setEditingId(null);
        setValue('vessel', '');
        setValue('type', '');
        setValue('expected_containers', '');
        setValue('flag', '');
        toast.info(language === 'ar' ? 'السفينة غير موجودة في قاعدة البيانات. الرجاء إدخال البيانات.' : 'Vessel not found in database. Please enter details.');
      }
    } catch (error) {
      console.error("IMO check failed", error);
      toast.error('Failed to verify IMO number');
    } finally {
      setCheckingIMO(false);
    }
  };

  const onSubmit = async (data: ArrivalFormData) => {
    try {
      const eta = `${data.arrivalDate}T${data.arrivalTime}:00`;

      if (editingId) {
        await agentService.updateArrival(editingId, {
          imo_number: `IMO${data.imo}`,
          name: data.vessel,
          type: data.type || 'container',
          expected_containers: data.type === 'container' ? (data.expected_containers ?? null) : null,
          flag: data.flag || 'Unknown',
          eta: eta,
          purpose: data.purpose,
          cargo: data.cargo,
          priority: data.priority,
          priority_reason: data.priority === 'Medium' ? data.priority_reason : undefined,
          priority_document: data.priority === 'High' ? data.priority_document : undefined,
        });
        toast.success(language === 'ar' ? 'تم تعديل طلب الوصول بنجاح!' : 'Arrival notification updated successfully!');
      } else {
        await agentService.submitArrival({
          imo_number: `IMO${data.imo}`,
          name: data.vessel,
          type: data.type || 'container',
          expected_containers: data.type === 'container' ? (data.expected_containers ?? null) : null,
          flag: data.flag || 'Unknown',
          eta: eta,
          purpose: data.purpose,
          cargo: data.cargo,
          priority: data.priority,
          priority_reason: data.priority === 'Medium' ? data.priority_reason : undefined,
          priority_document: data.priority === 'High' ? data.priority_document : undefined,
        });
        toast.success(language === 'ar' ? 'تم إرسال طلب الوصول بنجاح!' : 'Arrival notification submitted successfully!');
      }

      sessionStorage.removeItem(SESSION_KEY);
      setShowForm(false);
      reset({
        imo: '', vessel: '', type: '', expected_containers: '', flag: '', arrivalDate: '',
        arrivalTime: '', purpose: '', cargo: '', priority: 'Low', priority_reason: ''
      });
      setImoVerified(false);
      setVesselId(null);
      setEditingId(null);
      loadArrivals();
    } catch (error: any) {
      console.error("Submission failed", error);
      if (error.response?.data?.errors) {
        // Display Laravel validation errors
        Object.values(error.response.data.errors).forEach((err: any) => toast.error(err[0]));
      } else {
        toast.error(language === 'ar' ? 'فشل إرسال الطلب' : 'Submission failed');
      }
    }
  };

  const handleFinalize = async (id: number) => {
    try {
      await agentService.finalizeArrival(id);
      toast.success(language === 'ar' ? 'تم تقديم الخدمة بنجاح للسلطات!' : 'Arrival notification officially submitted to authorities!');
      loadArrivals();
    } catch (error: any) {
      const msg = error.response?.data?.message || (language === 'ar' ? 'فشل التقديم النهائي' : 'Final submission failed');
      toast.error(msg);
    }
  };


  const handleEdit = (notification: any) => {
    setEditingId(notification.id);
    setImoVerified(true);
    setVesselId(notification.id);

    setValue('imo', notification.imo_number.replace(/^IMO/, ''), { shouldValidate: true });
    setValue('vessel', notification.name, { shouldValidate: true });
    setValue('type', notification.type || '', { shouldValidate: true });
    setValue('expected_containers', notification.expected_containers ?? '', { shouldValidate: true });
    setValue('flag', notification.flag || '', { shouldValidate: true });
    setValue('purpose', notification.purpose || 'Loading/Unloading Cargo', { shouldValidate: true });
    setValue('cargo', notification.cargo || '', { shouldValidate: true });
    setValue('priority', notification.priority || 'Low', { shouldValidate: true });
    setValue('priority_reason', notification.priority_reason || '', { shouldValidate: true });

    // Parse ETA (handling both YYYY-MM-DD HH:mm:ss and ISO formats)
    if (notification.eta) {
      const etaStr = notification.eta.replace('T', ' ');
      const parts = etaStr.split(' ');
      if (parts.length >= 2) {
        setValue('arrivalDate', parts[0], { shouldValidate: true });
        setValue('arrivalTime', parts[1].substring(0, 5), { shouldValidate: true });
      } else {
        setValue('arrivalDate', notification.eta, { shouldValidate: true });
      }
    }

    setShowForm(true);
    setExpandedManifestId(notification.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-danger" />;
      case 'pending': return <Clock className="w-5 h-5 text-warning animate-pulse" />;
      case 'draft': return <Edit2 className="w-5 h-5 text-slate-400" />;
      default: return <AlertCircle className="w-5 h-5 text-info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'status-success';
      case 'rejected': return 'status-danger';
      case 'pending':
      case 'awaiting': return 'status-warning';
      case 'draft': return 'bg-slate-500/10 border-slate-500/30 text-slate-500';
      default: return 'status-info';
    }
  };

  const getStatusLabel = (status: string) => {
    return getTranslatedStatus(status, language);
  };

  return (
    <div className="space-y-6">
      <ExitReasonModal 
        isOpen={showExitModal}
        onClose={() => {
          setShowExitModal(false);
          setExitReason('');
          setSelectedVesselForExit(null);
        }}
        onConfirm={handleEmergencyExit}
        vesselName={selectedVesselForExit?.name || ''}
        exitReason={exitReason}
        setExitReason={setExitReason}
        isExiting={isExiting}
        t={t}
        language={language}
      />
      <div className="flex items-center justify-between mb-8 group">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500 cursor-default">{t.title}</h1>
          <p className="text-[var(--text-secondary)] font-medium">{t.subtitle}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
            {t.submitNew}
          </button>
        )}
      </div>

      {/* Submission Form - Glassmorphism */}
      {showForm && (
        <div className="bg-[var(--bg-primary)]/80 backdrop-blur-xl rounded-2xl border border-secondary/30 p-8 mb-8 shadow-2xl animate-in fade-in zoom-in duration-500 ring-1 ring-black/5">
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">
            {editingId ? (language === 'ar' ? 'تعديل طلب الوصول' : 'Edit Arrival Notification') : t.formTitle}
          </h2>

          {!imoVerified ? (
            /* Step 1: IMO Check */
            <div className="space-y-4">
              <div>
                <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{language === 'ar' ? 'رقم المنظمة البحرية الدولية (IMO)' : 'IMO Number'}</label>
                <div className="flex gap-3">
                  <div className="relative flex-1 flex items-center">
                    <span className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} font-bold text-[var(--text-secondary)]`}>IMO</span>
                    <input
                      type="text"
                      {...register('imo', {
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/\D/g, '');
                        }
                      })}
                      maxLength={7}
                      placeholder="1234567"
                      className={`w-full ${language === 'ar' ? 'pr-14 pl-4 text-right' : 'pl-14 pr-4'} py-3 bg-[var(--background)] border ${errors.imo ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckIMO}
                    disabled={checkingIMO || !watchImo}
                    className="btn-primary min-w-[160px] flex items-center justify-center"
                  >
                    {checkingIMO ? <LoadingIndicator type="line-spinner" size="xs" /> : (language === 'ar' ? 'تحقق من IMO' : 'Verify IMO')}
                  </button>
                </div>
                {errors.imo && <p className="text-danger text-xs font-bold mt-2">{errors.imo.message}</p>}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    setShowForm(false);
                    reset({
                      imo: '', vessel: '', type: '', expected_containers: '', flag: '', arrivalDate: '',
                      arrivalTime: '', purpose: '', cargo: '', priority: 'Low', priority_reason: ''
                    });
                    setImoVerified(false);
                    setVesselId(null);
                    setEditingId(null);
                  }}
                  className="btn-ghost"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Full Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="alert-info">
                <Ship className="w-5 h-5 flex-shrink-0" />
                <div className="font-bold">IMO: {getValues('imo')}</div>
                <CheckCircle2 className="w-5 h-5 text-success ml-auto" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Vessel Selection */}
                <div>
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.selectVessel}</label>
                  <input
                    type="text"
                    {...register('vessel')}
                    placeholder={language === 'ar' ? 'اسم السفينة' : 'Vessel Name'}
                    className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.vessel ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                    readOnly={!!vesselId} // Read-only if fetched from DB
                  />
                  {errors.vessel && <p className="text-danger text-xs font-bold mt-2">{errors.vessel.message}</p>}
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.purpose}</label>
                  <input
                    type="text"
                    {...register('purpose')}
                    placeholder={t.purposePlaceholder}
                    className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.purpose ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                  />
                  {errors.purpose && <p className="text-danger text-xs font-bold mt-2">{errors.purpose.message}</p>}
                </div>

                {/* Type & Flag (Visible if new vessel) */}
                {!vesselId && (
                  <>
                    <div>
                      <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{language === 'ar' ? 'نوع السفينة' : 'Vessel Type'}</label>
                      <select
                        {...register('type')}
                        className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.type ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all [&>option]:bg-[var(--bg-primary)]`}
                      >
                        <option value="">{language === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
                        <option value="container">{getTranslatedVesselType('container', language)}</option>
                      </select>
                      {errors.type && <p className="text-danger text-xs font-bold mt-2">{errors.type.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{language === 'ar' ? 'علم السفينة' : 'Flag'}</label>
                      <input
                        type="text"
                        {...register('flag')}
                        placeholder="e.g. Panama"
                        className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.flag ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                      />
                      {errors.flag && <p className="text-danger text-xs font-bold mt-2">{errors.flag.message}</p>}
                    </div>
                  </>
                )}

                {watchType === 'container' && (
                  <div className="animate-in fade-in zoom-in duration-300">
                    <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{language === 'ar' ? 'عدد الحاويات' : 'Number of containers'}</label>
                    <input
                      type="number"
                      min="0"
                      {...register('expected_containers')}
                      placeholder="e.g. 50"
                      className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.expected_containers ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                    />
                    {errors.expected_containers && <p className="text-danger text-xs font-bold mt-2">{errors.expected_containers.message}</p>}
                  </div>
                )}

                {/* Arrival Date */}
                <div>
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.arrivalDate}</label>
                  <input
                    type="date"
                    {...register('arrivalDate')}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.arrivalDate ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-all`}
                  />
                  {errors.arrivalDate && <p className="text-danger text-xs font-bold mt-2">{errors.arrivalDate.message}</p>}
                </div>

                {/* Arrival Time */}
                <div>
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.arrivalTime}</label>
                  <input
                    type="time"
                    {...register('arrivalTime')}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.arrivalTime ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-all`}
                  />
                  {errors.arrivalTime && <p className="text-danger text-xs font-bold mt-2">{errors.arrivalTime.message}</p>}
                </div>

                {/* Cargo Info */}
                <div className="md:col-span-2">
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.cargoInfo}</label>
                  <textarea
                    {...register('cargo')}
                    placeholder={t.cargoPlaceholder}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-secondary rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* Priority Selection */}
                <div className="md:col-span-2 bg-[var(--background)]/40 p-5 rounded-2xl border border-secondary/50">
                  <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.priorityLevel}</label>
                  <div className="flex flex-wrap gap-4 mb-4">
                    {(['Low', 'Medium', 'High'] as const).map((level) => (
                      <label key={level} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${watchPriority === level ? 'bg-primary/10 border-primary text-primary' : 'bg-[var(--background)] border-secondary text-[var(--text-secondary)] hover:border-primary/50'}`}>
                        <input
                          type="radio"
                          value={level}
                          {...register('priority')}
                          className="hidden"
                        />
                        <span className="font-bold">{(t as any)[`priority${level}`]}</span>
                      </label>
                    ))}
                  </div>

                  {/* Conditional UI based on Priority */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${watchPriority !== 'Low' ? 'mt-4 opacity-100 max-h-[500px]' : 'max-h-0 opacity-0'}`}>
                    {watchPriority === 'Medium' && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300 pb-2">
                        <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.priorityReason}</label>
                        <textarea
                          {...register('priority_reason')}
                          placeholder={(t as any).priorityReasonPlaceholder}
                          rows={2}
                          className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.priority_reason ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none`}
                        />
                        {errors.priority_reason && <p className="text-danger text-xs font-bold mt-2 hover:text-danger/80 transition-colors">{(t.errors as any).priorityReasonRequired}</p>}
                      </div>
                    )}
                    {watchPriority === 'High' && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300 pb-2">
                        <label className="block text-[var(--text-primary)] text-sm font-bold mb-3">{t.priorityDoc}</label>
                        <input
                          type="file"
                          accept=".pdf,.jpeg,.jpg"
                          {...register('priority_document')}
                          className={`w-full px-4 py-3 bg-[var(--background)] border ${errors.priority_document ? 'border-danger' : 'border-secondary'} rounded-xl text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer`}
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">{(t as any).priorityDocNote}</p>
                        {errors.priority_document && <p className="text-danger text-xs font-bold mt-2 hover:text-danger/80 transition-colors">{(errors.priority_document?.message as string)?.includes('format') ? (t.errors as any).priorityDocFormat : (t.errors as any).priorityDocRequired}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-4 text-lg"
                >
                  {isSubmitting ? <LoadingIndicator type="line-spinner" size="xs" label={language === 'ar' ? 'جاري الإرسال...' : 'Submitting...'} className="text-white" /> : t.submitButton}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    setShowForm(false);
                    reset({
                      imo: '', vessel: '', type: '', expected_containers: '', flag: '', arrivalDate: '',
                      arrivalTime: '', purpose: '', cargo: '', priority: 'Low', priority_reason: ''
                    });
                    setImoVerified(false);
                    setVesselId(null);
                    setEditingId(null);
                  }}
                  className="btn-secondary px-10 py-4 font-bold"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-[var(--text-secondary)] py-20 bg-[var(--bg-primary)] border border-secondary rounded-3xl">
            <LoadingIndicator 
              type="line-spinner" 
              size="lg" 
              label={language === 'ar' ? 'جاري مزامنة البيانات...' : 'Synchronizing Data...'} 
            />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] py-16 border-2 border-dashed border-secondary rounded-3xl bg-[var(--bg-primary)]/50">
            <Ship className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold">{language === 'ar' ? 'لا توجد إشعارات وصول.' : 'No arrival notifications found.'}</p>
          </div>
        ) : notifications.map((notification) => {
          const hasManifest = notification.containers && notification.containers.length > 0;
          const containerMismatch = notification.type === 'container' && notification.expected_containers && notification.containers?.length !== notification.expected_containers;
          const hasManifestErrors = notification.status === 'draft' && (
            !hasManifest ||
            notification.containers.some((c: any) => c.extraction_status !== 'extracted') ||
            containerMismatch
          );
          const isRTL = language === 'ar';
          return (
            <div
              key={notification.id}
              id={`arrival-notification-${notification.imo_number}`}
              className={`card-base card-hover p-6 group relative overflow-hidden transition-all duration-500 ${highlightedImo === notification.imo_number ? 'ring-4 ring-primary ring-offset-2 ring-offset-[var(--background)] scale-[1.02] bg-[var(--surface-highlight)]' : ''} ${notification.status === 'draft' ? 'border-dashed border-slate-500/40' : ''}`}
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 ${getStatusColor(notification.status)}`}>
                    {getStatusIcon(notification.status)}
                  </div>
                  <div>
                    <h3 className="text-[var(--text-primary)] font-black text-xl mb-1">{notification.name}</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-[var(--text-secondary)] text-sm font-bold">{t.requestId}: <span className="font-mono">{notification.id}</span></p>
                      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]/80 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Ship className="w-3 h-3" /> IMO: {notification.imo_number}</span>
                        <span>{language === 'ar' ? 'النوع' : 'Type'}: {getTranslatedVesselType(notification.type, language)}</span>
                        {notification.type === 'container' && notification.expected_containers && (
                          <span>{language === 'ar' ? 'الحاويات' : 'Containers'}: {notification.containers?.length || 0} / {notification.expected_containers}</span>
                        )}
                        <span>{language === 'ar' ? 'العلم' : 'Flag'}: {notification.flag}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
                  <span className={`inline-block px-5 py-2 rounded-2xl text-sm font-black border-2 ${getStatusColor(notification.status)}`}>
                    {getStatusLabel(notification.status)}
                  </span>

                  {/* Manifest Status Badge */}
                  <span className={`inline-block px-4 py-1.5 rounded-xl text-xs font-bold border ${hasManifest ? 'status-success' : 'bg-[var(--bg-primary)] border-secondary text-[var(--text-secondary)]'}`}>
                    {hasManifest ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {getManifestStatusLabel(true, language)}
                      </span>
                    ) : (
                      <span>{getManifestStatusLabel(false, language)}</span>
                    )}
                  </span>

                  {/* Finalize Button for Drafts */}
                  {notification.status === 'draft' && (
                    <div className="flex flex-col items-end gap-2 mt-2 w-full">
                      {hasManifestErrors && (
                        <p className="text-[10px] text-red-500 font-bold bg-red-500/5 px-2 py-1 rounded border border-red-500/10 max-w-[200px] text-right">
                          {containerMismatch
                            ? (isRTL ? `عدد الحاويات المرفوعة لا يتطابق مع العدد المتوقع (${notification.expected_containers})` : `Uploaded manifests do not match the expected container count (${notification.expected_containers})`)
                            : (isRTL ? 'يرجى حل جميع أخطاء استخراج البيانات قبل التقديم.' : 'Please resolve all manifest extraction errors before submitting.')}
                        </p>
                      )}
                      <button
                        onClick={() => handleFinalize(notification.id)}
                        disabled={hasManifestErrors}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 w-full md:w-auto justify-center
                          ${hasManifestErrors
                            ? 'bg-secondary text-[var(--text-secondary)] cursor-not-allowed opacity-40 shadow-none'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                          }
                        `}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isRTL ? 'تقديم نهائي للسلطات' : 'Finalize & Submit'}
                      </button>
                    </div>
                  )}

                  {(notification.status === 'awaiting' || notification.status === 'pending' || notification.status === 'draft') ? (
                    <button
                      onClick={() => handleEdit(notification)}
                      className="btn-ghost p-2 mt-1"
                      title={language === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <Edit2 className="w-5 h-5 text-primary" />
                    </button>
                  ) : null}

                  {/* Emergency Exit Button */}
                  {(notification.status === 'awaiting' || notification.status === 'approved' || notification.status === 'draft') && (
                    <button
                      onClick={() => {
                        // Business Rule: Check if anchorage requested
                        // Note: In a real scenario, the backend would provide 'has_anchorage_request' boolean
                        // For now, we rely on the specific blocking logic requested
                        if (notification.anchorage_request || notification.status === 'anchored') {
                          toast.warning(t.leaveVesselAnchorageAlert);
                          return;
                        }
                        setSelectedVesselForExit(notification);
                        setShowExitModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all"
                      title={t.leaveVessel}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t.leaveVessel}
                    </button>
                  )}

                  <button
                    onClick={() => exportArrivalPdf({
                      vessel_name: notification.name || notification.vessel_name || 'Unknown Vessel',
                      imo_number: notification.imo_number || '—',
                      type: notification.type,
                      flag: notification.flag,
                      eta: notification.eta,
                      status: notification.status,
                      purpose: notification.purpose,
                      cargo: notification.cargo,
                      priority: notification.priority,
                      rejection_reason: notification.rejection_reason,
                      created_at: notification.created_at,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all"
                    title={language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border border-secondary rounded-2xl p-4 bg-[var(--background)]/40 hover:border-primary transition-colors">
                  <div className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest mb-1">{t.expectedArrival}</div>
                  <div className="text-[var(--text-primary)] font-black">{notification.eta}</div>
                </div>
                <div className="border border-secondary rounded-2xl p-4 bg-[var(--background)]/40 hover:border-primary transition-colors">
                  <div className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest mb-1">{t.submittedOn}</div>
                  <div className="text-[var(--text-primary)] font-black">{new Date(notification.created_at).toLocaleString()}</div>
                </div>
                {notification.approvedBy && (
                  <div className="border border-secondary rounded-2xl p-4 bg-[var(--background)]/40 hover:border-primary transition-colors">
                    <div className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest mb-1">{t.approvedBy}</div>
                    <div className="text-[var(--text-primary)] font-black">{notification.approvedBy}</div>
                  </div>
                )}
              </div>

              {/* Rejection Reason */}
              {notification.status === 'rejected' && notification.rejection_reason && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-500 font-bold text-sm mb-1 uppercase tracking-wider">
                      {language === 'ar' ? 'ملاحظات الإدارة' : 'Executive Feedback'}
                    </div>
                    <div className="text-red-400 text-sm font-medium">{notification.rejection_reason}</div>
                  </div>
                </div>
              )}

              {/* Manifest Upload Section */}
              {notification.status !== 'rejected' && (
                <div className="mt-4">
                  {expandedManifestId === notification.id ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <ManifestUploader
                        vesselId={notification.id}
                        language={language}
                        expectedContainers={notification.expected_containers}
                        existingContainerCount={notification.containers?.length || 0}
                        existingContainers={notification.containers || []}
                        onUploadSuccess={() => {
                          setExpandedManifestId(null);
                          loadArrivals();
                        }}
                        onContainerDeleted={() => loadArrivals()}
                        onAdjustCount={() => handleEdit(notification)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedManifestId(notification.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-secondary/40 hover:border-primary/60 rounded-xl text-[var(--text-secondary)] hover:text-primary font-bold text-sm transition-all hover:bg-primary/5"
                    >
                      <UploadCloud className="w-5 h-5" />
                      {hasManifest
                        ? hasManifestErrors 
                            ? (language === 'ar' ? 'عرض وحل أخطاء الاستخراج' : 'View & Resolve Extraction Errors')
                            : (language === 'ar' ? 'رفع بيانات شحن إضافية' : 'Upload Additional Manifests')
                        : (language === 'ar' ? 'رفع بيانات الشحن (بوليصة الشحن)' : 'Upload Cargo Manifests')}
                    </button>
                  )}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  );
}
