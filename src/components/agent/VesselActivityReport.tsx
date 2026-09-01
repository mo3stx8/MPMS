import { useState, useEffect, useRef } from 'react';
import {
  Ship, Anchor, FileCheck, Calendar, Search, Download,
  AlertTriangle, CheckCircle, Clock, XCircle, FileText,
  MapPin, Hash, Flag, Package, Zap, User, ChevronDown,
  Printer, Info
} from 'lucide-react';
import { Language } from '../../App';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import {
  agentService,
  Vessel,
  VesselActivityReport as VesselReport,
  ReportClearance,
  ReportAnchorage,
  ReportArrival
} from '../../services/agentService';
import { getTranslatedStatus, getTranslatedVesselType } from '../../utils/formatters';

interface VesselActivityReportProps {
  language: Language;
  vesselId?: string | number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt: string | null | undefined) =>
  dt ? new Date(dt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDate = (dt: string | null | undefined) =>
  dt ? new Date(dt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    active:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    valid:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    completed:     'bg-sky-500/15    text-sky-400    border-sky-500/30',
    pending:       'bg-amber-500/15  text-amber-400  border-amber-500/30',
    awaiting:      'bg-amber-500/15  text-amber-400  border-amber-500/30',
    waiting:       'bg-amber-500/15  text-amber-400  border-amber-500/30',
    rejected:      'bg-rose-500/15   text-rose-400   border-rose-500/30',
    expired:       'bg-rose-500/15   text-rose-400   border-rose-500/30',
    wharf_assigned:'bg-sky-500/15    text-sky-400    border-sky-500/30',
    clearance_approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    pending_clearance: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return map[status] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

function statusIcon(status: string) {
  const ok = ['approved', 'active', 'valid', 'completed', 'wharf_assigned'];
  const warn = ['pending', 'awaiting', 'waiting'];
  if (ok.includes(status)) return <CheckCircle className="w-3.5 h-3.5" />;
  if (warn.includes(status)) return <Clock className="w-3.5 h-3.5" />;
  return <XCircle className="w-3.5 h-3.5" />;
}

// ─── Sub-cards ─────────────────────────────────────────────────────────────────

function ArrivalCard({ data, language }: { data: ReportArrival; language: Language }) {
  const isAR = language === 'ar';
  const rows = [
    { icon: Hash,    label: isAR ? 'رقم IMO' : 'IMO Number',    value: data.imo_number },
    { icon: Ship,    label: isAR ? 'نوع السفينة' : 'Vessel Type',   value: getTranslatedVesselType(data.type, language) },
    { icon: Flag,    label: isAR ? 'العلم' : 'Flag',          value: data.flag },
    { icon: Calendar,label: isAR ? 'وقت الوصول المتوقع' : 'ETA',           value: fmt(data.eta) },
    { icon: Calendar,label: isAR ? 'وقت المغادرة المتوقع' : 'ETD',           value: fmt(data.etd) },
    { icon: Package, label: isAR ? 'الشحنة' : 'Cargo',         value: data.cargo || '—' },
    { icon: Info,    label: isAR ? 'الغرض' : 'Purpose',       value: data.purpose || '—' },
    { icon: Zap,     label: isAR ? 'الأولوية' : 'Priority',      value: data.priority || (isAR ? 'منخفضة' : 'Low') },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-highlight)]/40 border border-[var(--border-color)] print:bg-gray-50 print:border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 print:bg-blue-100">
            <Icon className="w-4 h-4 text-blue-400 print:text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold print:text-gray-500">{label}</p>
            <p className="text-[var(--text-primary)] font-semibold text-sm truncate print:text-gray-900">{value}</p>
          </div>
        </div>
      ))}
      {data.priority_reason && (
        <div className="sm:col-span-2 flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 print:bg-amber-50 print:border-amber-200">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0 print:text-amber-600" />
          <div>
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold print:text-gray-500">{isAR ? 'سبب الأولوية' : 'Priority Reason'}</p>
            <p className="text-[var(--text-primary)] font-medium text-sm print:text-gray-900">{data.priority_reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AnchorageCard({ data, language }: { data: ReportAnchorage; language: Language }) {
  const isAR = language === 'ar';
  const rows = [
    { icon: Calendar, label: isAR ? 'وقت الرسو' : 'Docking Time',     value: fmt(data.docking_time) },
    { icon: Clock,    label: isAR ? 'المدة' : 'Duration',          value: `${data.duration} ${isAR ? 'ساعة' : 'hour(s)'}` },
    { icon: MapPin,   label: isAR ? 'الموقع' : 'Location',          value: data.location || '—' },
    { icon: FileText, label: isAR ? 'السبب' : 'Reason',            value: data.reason || '—' },
    { icon: Anchor,   label: isAR ? 'الرصيف المعين' : 'Wharf Assigned',    value: data.wharf ? data.wharf.name : '—' },
    { icon: Calendar, label: isAR ? 'تاريخ التعيين' : 'Wharf Assigned At', value: fmt(data.wharf_assigned_at) },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-highlight)]/40 border border-[var(--border-color)] print:bg-gray-50 print:border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 print:bg-violet-100">
            <Icon className="w-4 h-4 text-violet-400 print:text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold print:text-gray-500">{label}</p>
            <p className="text-[var(--text-primary)] font-semibold text-sm print:text-gray-900">{value}</p>
          </div>
        </div>
      ))}
      {data.rejection_reason && (
        <div className="sm:col-span-2 flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 print:bg-red-50 print:border-red-200">
          <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0 print:text-red-600" />
          <div>
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold print:text-gray-500">{isAR ? 'سبب الرفض' : 'Rejection Reason'}</p>
            <p className="text-[var(--text-primary)] font-medium text-sm print:text-gray-900">{data.rejection_reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ClearanceCard({ data, language }: { data: ReportClearance; language: Language }) {
  const isAR = language === 'ar';
  const rows = [
    { icon: Hash,    label: isAR ? 'رقم التصريح' : 'Clearance ID', value: data.clearance_id },
    { icon: MapPin,  label: isAR ? 'الميناء التالي' : 'Next Port',    value: data.next_port || '—' },
    { icon: Calendar,label: isAR ? 'تاريخ الإصدار' : 'Issue Date',   value: fmt(data.issue_date) },
    { icon: Calendar,label: isAR ? 'تاريخ الانتهاء' : 'Expiry Date',  value: fmt(data.expiry_date) },
    { icon: User,    label: isAR ? 'صدر بواسطة' : 'Issued By',    value: data.officer ? data.officer.name : (isAR ? 'النظام' : 'System') },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-highlight)]/40 border border-[var(--border-color)] print:bg-gray-50 print:border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 print:bg-emerald-100">
            <Icon className="w-4 h-4 text-emerald-400 print:text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold print:text-gray-500">{label}</p>
            <p className="text-[var(--text-primary)] font-semibold text-sm print:text-gray-900">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Module Section Wrapper ────────────────────────────────────────────────────

interface ModuleSectionProps {
  index: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  status: string | null;
  isMissing: boolean;
  accentClass: string;
  iconBgClass: string;
  children: React.ReactNode;
}

function ModuleSection({
  index, icon: Icon, title, subtitle, status, isMissing,
  accentClass, iconBgClass, children, language
}: ModuleSectionProps & { language: Language }) {
  const [open, setOpen] = useState(true);
  const isAR = language === 'ar';

  return (
    <div className={`card-base overflow-hidden print:border print:border-gray-200 print:rounded-xl print:shadow-none print:break-inside-avoid ${isMissing ? 'border-rose-500/30' : ''}`}>
      {/* Section Header */}
      <div
        className={`flex items-center justify-between p-5 border-b border-[var(--border-color)] cursor-pointer group select-none print:border-gray-200 ${isMissing ? 'bg-rose-500/5' : 'bg-[var(--surface)]/30'}`}
        onClick={() => !isMissing && setOpen(o => !o)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isMissing ? 'bg-rose-500/10' : iconBgClass} flex-shrink-0`}>
            {isMissing
              ? <AlertTriangle className="w-5 h-5 text-rose-400" />
              : <Icon className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${isMissing ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
                {isAR ? 'وحدة' : 'Module'} {index}
              </span>
              {!isMissing && status && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(status)}`}>
                  {statusIcon(status)}
                  <span className="capitalize">{getTranslatedStatus(status, language)}</span>
                </span>
              )}
            </div>
            <h3 className={`font-bold text-base mt-0.5 ${isMissing ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>{title}</h3>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">{subtitle}</p>
          </div>
        </div>
        {!isMissing && (
          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''} print:hidden`} />
        )}
      </div>

      {/* Missing alert body */}
      {isMissing && (
        <div className="p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-400 font-semibold">{isAR ? 'وثيقة مفقودة' : 'Missing Documentation'}</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {isAR ? (
                <>لا يوجد سجل لـ <strong className="text-[var(--text-primary)]">{title}</strong> لهذه السفينة والتاريخ المحددين.</>
              ) : (
                <>No <strong className="text-[var(--text-primary)]">{title}</strong> record was found for the selected vessel and date.</>
              )}
              <br />
              {isAR ? 'يرجى التأكد من تقديم هذه الوثيقة قبل إنشاء تقرير PDF.' : 'Please ensure this document has been submitted before generating the PDF report.'}
            </p>
          </div>
        </div>
      )}

      {/* Expandable content */}
      {!isMissing && open && (
        <div className="p-5 print:p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Print Stylesheet injected into <head> ─────────────────────────────────────

const PRINT_STYLE = `
@media print {
  @page { margin: 18mm 14mm; size: A4 portrait; }
  body * { visibility: hidden !important; }
  #vessel-report-printzone, #vessel-report-printzone * { visibility: visible !important; }
  #vessel-report-printzone { position: fixed; inset: 0; padding: 0; overflow: visible; background: white; }

  /* Typography */
  #vessel-report-printzone { font-family: var(--font-sans); color: #111827; }

  /* Header section always on first page */
  #report-print-header { page-break-after: avoid; margin-bottom: 24px; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; }

  /* Each module starts on its own block, avoids mid-card breaks */
  .print-module { page-break-inside: avoid; margin-bottom: 20px; }

  /* Hide UI-only elements */
  .print\\:hidden { display: none !important; }
}
`;

// ─── Main Component ────────────────────────────────────────────────────────────

export function VesselActivityReport({ language, vesselId }: VesselActivityReportProps) {
  const isRTL = language === 'ar';

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [report, setReport] = useState<VesselReport | null>(null);
  const [reportList, setReportList] = useState<VesselReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVessels, setLoadingVessels] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const printZoneRef = useRef<HTMLDivElement>(null);

  // Inject print CSS once
  useEffect(() => {
    const id = 'vessel-report-print-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = PRINT_STYLE;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  // Load vessel list for dropdown
  useEffect(() => {
    agentService.getVessels().then(v => {
      setVessels(v);
      setLoadingVessels(false);
    });
  }, []);
  
  // Handle auto-selection if vesselId is provided via props
  useEffect(() => {
    if (vesselId && vessels.length > 0) {
      const vid = Number(vesselId);
      if (vessels.some(v => v.id === vid)) {
        setSelectedVesselId(vid);
        // Default to today if no date is picked
        if (!selectedDate) {
          setSelectedDate(new Date().toISOString().split('T')[0]);
        }
      }
    }
  }, [vesselId, vessels]);

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  const missingDocs = report
    ? [
        !report.arrival   && 'Arrival Notification',
        !report.anchorage && 'Anchorage Request',
        !report.clearance && 'Port Clearance',
      ].filter(Boolean) as string[]
    : [];

  const allMissing = missingDocs.length === 3;
  const canExport  = report !== null && !allMissing;

  // ── Fetch Report ──
  const handleSearch = async () => {
    if (!selectedVesselId && !selectedDate) return;
    setIsLoading(true);
    setHasSearched(true);
    setReport(null);
    setReportList([]);

    const result = await agentService.getVesselActivityReport(selectedVesselId, selectedDate);
    
    if (Array.isArray(result)) {
      if (result.length === 1) {
        setReport(result[0]);
      } else {
        setReportList(result);
      }
    } else {
      setReport(result);
    }
    
    setIsLoading(false);
  };

  // ── PDF Export via window.print() ──
  const handleExportPDF = () => {
    if (!canExport || !report) return;
    window.print();
  };

  // ── Today's date as max for the date picker ──
  const today = new Date().toISOString().split('T')[0];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════════════════════════ ON-SCREEN UI ══ */}
      <div className="space-y-8 p-1 print:hidden">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight drop-shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              {isRTL ? 'تقرير نشاط السفينة' : 'Vessel Activity Report'}
            </h1>
            <p className="text-[var(--text-secondary)] font-medium text-base ml-15">
              {isRTL
                ? 'استخرج تقرير موحد يشمل بلاغ الوصول، طلب الرسو، وتصريح الميناء.'
                : 'Extract a consolidated report covering Arrival Notification, Anchorage Request, and Port Clearance.'}
            </p>
          </div>

          {report && canExport && (
            <button
              id="btn-extract-pdf"
              onClick={handleExportPDF}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              {isRTL ? 'استخراج PDF' : 'Extract as PDF'}
            </button>
          )}

          {report !== null && allMissing && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              {isRTL ? 'لا توجد وثائق — لا يمكن إنشاء PDF' : 'No documents found — PDF disabled'}
            </div>
          )}
        </div>

        {/* ── Selection Panel ── */}
        <div className="card-base p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <h2 className="text-lg font-black text-[var(--text-primary)] mb-5 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            {isRTL ? 'اختر السفينة والتاريخ' : 'Select Vessel & Date'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Vessel Dropdown */}
            <div className="space-y-2">
              <label className="text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-wider block">
                <Ship className="w-3.5 h-3.5 inline mr-1.5 opacity-70" />
                {isRTL ? 'السفينة' : 'Vessel'}
              </label>
              <div className="relative">
                <select
                  id="select-vessel"
                  value={selectedVesselId}
                  onChange={e => { setSelectedVesselId(Number(e.target.value) || ''); setReport(null); setHasSearched(false); }}
                  disabled={loadingVessels}
                  className="w-full appearance-none bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">{loadingVessels ? 'Loading…' : (isRTL ? '— اختر سفينة —' : '— Select a vessel —')}</option>
                  {vessels.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.flag || 'N/A'})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-wider block">
                <Calendar className="w-3.5 h-3.5 inline mr-1.5 opacity-70" />
                {isRTL ? 'التاريخ' : 'Date'}
              </label>
              <input
                id="input-report-date"
                type="date"
                max={today}
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setReport(null); setHasSearched(false); }}
                className="w-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* Generate Button */}
            <button
              id="btn-generate-preview"
              onClick={handleSearch}
              disabled={(!selectedVesselId && !selectedDate) || isLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 min-w-[160px]"
            >
              {isLoading
                ? <LoadingIndicator type="line-spinner" size="xs" label={isRTL ? 'جارٍ التحميل…' : 'Loading…'} className="text-white" />
                : <><Search className="w-4 h-4" />{isRTL ? 'عرض التقرير' : 'Generate Preview'}</>
              }
            </button>
          </div>
        </div>

        {/* ── Missing Docs Alert Banner ── */}
        {hasSearched && !isLoading && report !== null && missingDocs.length > 0 && (
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/8 border border-rose-500/25 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-rose-400 font-bold text-base">
                {isRTL ? 'وثائق مفقودة' : 'Missing Documentation Detected'}
              </p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                {isRTL ? 'الوثائق التالية غير موجودة لهذا التاريخ:' : 'The following documents were not found for the selected vessel and date:'}
              </p>
              <ul className="mt-2 space-y-1">
                {missingDocs.map(doc => (
                  <li key={doc} className="flex items-center gap-2 text-rose-300 text-sm font-semibold">
                    <XCircle className="w-4 h-4" /> {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Report Preview / Selection ── */}
        {hasSearched && !isLoading && (
          <div className="space-y-5">
            {/* Multiple Results Found */}
            {reportList.length > 0 && !report && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-400 text-sm font-bold">
                  <Info className="w-4 h-4" />
                  {isRTL ? `تم العثور على ${reportList.length} سفن نشطة في هذا التاريخ` : `Found ${reportList.length} active vessels on this date`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportList.map(r => (
                    <div 
                      key={r.vessel.id}
                      onClick={() => setReport(r)}
                      className="group p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-blue-500/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Ship className="w-5 h-5 text-blue-400" />
                        </div>
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] -rotate-90" />
                      </div>
                      <h4 className="font-black text-[var(--text-primary)] text-lg mb-1">{r.vessel.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold mb-4">
                        <Hash className="w-3 h-3" /> {r.vessel.imo}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {r.arrival && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase">Arrival</span>
                        )}
                        {r.anchorage && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-black uppercase">Anchorage</span>
                        )}
                        {r.clearance && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">Clearance</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single Report Preview */}
            {report && (
              <>
                {/* Back button if search returned multiple results */}
                {reportList.length > 1 && (
                  <button 
                    onClick={() => setReport(null)}
                    className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-2"
                  >
                    ← {isRTL ? 'العودة للنتائج' : 'Back to Results'}
                  </button>
                )}

                {/* Report meta bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Ship className="w-4 h-4 text-primary" />
                    <span className="font-bold text-[var(--text-primary)]">{report.vessel?.name || 'Unknown Vessel'}</span>
                    <span className="text-[var(--text-muted)]">({report.vessel?.imo || 'N/A'})</span>
                  </div>
                  <span className="text-[var(--text-muted)]">·</span>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{fmtDate(report.date)}</span>
                  </div>
                  <span className="text-[var(--text-muted)]">·</span>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Printer className="w-4 h-4 text-primary" />
                    <span>{isRTL ? 'تاريخ الاستخراج:' : 'Generated:'} {new Date().toLocaleString()}</span>
                  </div>
                </div>

                {/* Module 1 — Arrival Notification */}
                <ModuleSection
                  index={1}
                  icon={Ship}
                  title={isRTL ? 'بلاغ الوصول' : 'Arrival Notification'}
                  subtitle={isRTL ? 'الطوابع الزمنية، إعلانات الشحن وحالة الأمان' : 'Timestamps, cargo declarations and security status'}
                  status={report.arrival?.status ?? null}
                  isMissing={!report.arrival}
                  accentClass="from-blue-600 to-cyan-500"
                  iconBgClass="bg-gradient-to-br from-blue-600 to-cyan-500"
                  language={language}
                >
                  <ArrivalCard data={report.arrival!} language={language} />
                </ModuleSection>

                {/* Module 2 — Anchorage Request */}
                <ModuleSection
                  index={2}
                  icon={Anchor}
                  title={isRTL ? 'طلب الرسو' : 'Anchorage Request'}
                  subtitle={isRTL ? 'إحداثيات الموضع، المدة المطلوبة وسجلات الحالة' : 'Position coordinates, requested duration and status logs'}
                  status={report.anchorage?.status ?? null}
                  isMissing={!report.anchorage}
                  accentClass="from-violet-600 to-purple-500"
                  iconBgClass="bg-gradient-to-br from-violet-600 to-purple-500"
                  language={language}
                >
                  <AnchorageCard data={report.anchorage!} language={language} />
                </ModuleSection>

                {/* Module 3 — Port Clearance */}
                <ModuleSection
                  index={3}
                  icon={FileCheck}
                  title={isRTL ? 'تصريح الميناء' : 'Port Clearance'}
                  subtitle={isRTL ? 'رموز التفويض الرسمية، جاهزية المغادرة وختم الامتثال' : 'Official authorization codes, departure readiness and compliance stamps'}
                  status={report.clearance?.status ?? null}
                  isMissing={!report.clearance}
                  accentClass="from-emerald-600 to-teal-500"
                  iconBgClass="bg-gradient-to-br from-emerald-600 to-teal-500"
                  language={language}
                >
                  <ClearanceCard data={report.clearance!} language={language} />
                </ModuleSection>

                {/* Bottom Export CTA */}
                {canExport && (
                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-extract-pdf-bottom"
                      onClick={handleExportPDF}
                      className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      <Download className="w-5 h-5" />
                      {isRTL ? 'استخراج التقرير كـ PDF' : 'Extract as PDF'}
                      <span className="text-blue-200 text-sm font-medium ml-1">
                        · Report_{report.vessel.name.replace(/\s+/g, '_')}_{report.date}.pdf
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* No Results found on specific date */}
            {hasSearched && reportList.length === 0 && !report && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--surface)]/20">
                <AlertTriangle className="w-12 h-12 text-rose-500 opacity-20 mb-4" />
                <h3 className="text-xl font-black text-[var(--text-secondary)] mb-2">
                  {isRTL ? 'لا توجد نتائج' : 'No Activity Found'}
                </h3>
                <p className="text-[var(--text-muted)] text-sm max-w-sm text-center">
                  {isRTL 
                    ? 'لم نجد أي سجلات وصول أو رسو أو تصريح لهذا التاريخ.'
                    : 'We couldn\'t find any arrival, anchorage, or clearance records for the selected parameters.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Empty State ── */}
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--surface)]/20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 flex items-center justify-center mb-5 shadow-inner">
              <FileText className="w-9 h-9 text-primary opacity-60" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-secondary)] mb-2">
              {isRTL ? 'ابدأ بتحديد السفينة أو التاريخ' : 'Select a Vessel or Date to Begin'}
            </h3>
            <p className="text-[var(--text-muted)] text-sm max-w-sm text-center">
              {isRTL
                ? 'اختر السفينة أو حدد التاريخ (أو كليهما) ثم اضغط "عرض التقرير" لاستخراج ملخص الوثائق.'
                : 'Choose a vessel or pick a date (or both), then click "Generate Preview" to see the consolidated document summary.'}
            </p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════ PRINT ZONE ══
          Hidden on screen, rendered for print only.
          The @media print CSS makes only this zone visible.
      ══════════════════════════════════════════════════════ */}
      {report && (
        <div id="vessel-report-printzone" ref={printZoneRef} style={{ display: 'none' }}>
          <style>{`
            @media print {
              #vessel-report-printzone { display: block !important; background: white; padding: 0; font-family: var(--font-sans); color: #111827; }
            }
          `}</style>

          {/* ── Print Header ── */}
          <div id="report-print-header" style={{ borderBottom: '2px solid #1d4ed8', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '18px' }}>⚓</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' }}>Manarah Sea Port</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#111827', letterSpacing: '-0.5px' }}>Vessel Activity Report</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#6b7280', lineHeight: '1.7' }}>
              <div><strong style={{ color: '#111827' }}>Vessel:</strong> {report.vessel.name} &nbsp;|&nbsp; IMO: {report.vessel.imo}</div>
              <div><strong style={{ color: '#111827' }}>Report Date:</strong> {fmtDate(report.date)}</div>
              <div><strong style={{ color: '#111827' }}>Generated:</strong> {new Date().toLocaleString()}</div>
              <div style={{ marginTop: '6px', padding: '3px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', display: 'inline-block', color: '#1d4ed8', fontWeight: '700', fontSize: '10px', letterSpacing: '1px' }}>
                OFFICIAL DOCUMENT
              </div>
            </div>
          </div>

          {/* ── Module 1: Arrival ── */}
          <div className="print-module" style={{ marginBottom: '20px', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px 10px 0 0', padding: '10px 14px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>🚢</span>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' }}>Module 1</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e40af' }}>Arrival Notification</div>
              </div>
              {report.arrival
                ? <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '20px', color: '#065f46', fontSize: '10px', fontWeight: '700' }}>{report.arrival.status?.toUpperCase()}</span>
                : <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '20px', color: '#991b1b', fontSize: '10px', fontWeight: '700' }}>MISSING</span>
              }
            </div>
            {report.arrival ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', fontSize: '11px' }}>
                {[
                  ['IMO Number', report.arrival.imo_number], ['Type', report.arrival.type], ['Flag', report.arrival.flag],
                  ['ETA', fmt(report.arrival.eta)], ['ETD', fmt(report.arrival.etd)], ['Status', report.arrival.status],
                  ['Cargo', report.arrival.cargo || '—'], ['Purpose', report.arrival.purpose || '—'],
                  ['Priority', report.arrival.priority || 'Low'],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ padding: '6px 14px', fontWeight: '600', color: '#374151', width: '35%', borderBottom: '1px solid #f3f4f6' }}>{k}</td>
                    <td style={{ padding: '6px 14px', color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{v}</td>
                  </tr>
                ))}
              </table>
            ) : (
              <div style={{ border: '1px solid #fecaca', borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#fff5f5', padding: '14px', color: '#991b1b', fontSize: '12px', fontWeight: '600' }}>
                ⚠ No Arrival Notification found for the selected date.
              </div>
            )}
          </div>

          {/* ── Module 2: Anchorage ── */}
          <div className="print-module" style={{ marginBottom: '20px', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px 10px 0 0', padding: '10px 14px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>⚓</span>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' }}>Module 2</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#6d28d9' }}>Anchorage Request</div>
              </div>
              {report.anchorage
                ? <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '20px', color: '#065f46', fontSize: '10px', fontWeight: '700' }}>{report.anchorage.status?.toUpperCase().replace('_', ' ')}</span>
                : <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '20px', color: '#991b1b', fontSize: '10px', fontWeight: '700' }}>MISSING</span>
              }
            </div>
            {report.anchorage ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', fontSize: '11px' }}>
                {[
                  ['Docking Time', fmt(report.anchorage.docking_time)], ['Duration', `${report.anchorage.duration} hour(s)`],
                  ['Location', report.anchorage.location || '—'], ['Reason', report.anchorage.reason || '—'],
                  ['Wharf Assigned', report.anchorage.wharf ? report.anchorage.wharf.name : '—'],
                  ['Wharf Assigned At', fmt(report.anchorage.wharf_assigned_at)],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ padding: '6px 14px', fontWeight: '600', color: '#374151', width: '35%', borderBottom: '1px solid #f3f4f6' }}>{k}</td>
                    <td style={{ padding: '6px 14px', color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{v}</td>
                  </tr>
                ))}
              </table>
            ) : (
              <div style={{ border: '1px solid #fecaca', borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#fff5f5', padding: '14px', color: '#991b1b', fontSize: '12px', fontWeight: '600' }}>
                ⚠ No Anchorage Request found for the selected date.
              </div>
            )}
          </div>

          {/* ── Module 3: Port Clearance ── */}
          <div className="print-module" style={{ marginBottom: '20px', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px 10px 0 0', padding: '10px 14px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#059669,#0d9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' }}>Module 3</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#065f46' }}>Port Clearance</div>
              </div>
              {report.clearance
                ? <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '20px', color: '#065f46', fontSize: '10px', fontWeight: '700' }}>{report.clearance.status?.toUpperCase()}</span>
                : <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '20px', color: '#991b1b', fontSize: '10px', fontWeight: '700' }}>MISSING</span>
              }
            </div>
            {report.clearance ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', fontSize: '11px' }}>
                {[
                  ['Clearance ID', report.clearance.clearance_id], ['Next Port', report.clearance.next_port || '—'],
                  ['Issue Date', fmt(report.clearance.issue_date)], ['Expiry Date', fmt(report.clearance.expiry_date)],
                  ['Status', report.clearance.status], ['Issued By', report.clearance.officer ? report.clearance.officer.name : 'System'],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ padding: '6px 14px', fontWeight: '600', color: '#374151', width: '35%', borderBottom: '1px solid #f3f4f6' }}>{k}</td>
                    <td style={{ padding: '6px 14px', color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{v}</td>
                  </tr>
                ))}
              </table>
            ) : (
              <div style={{ border: '1px solid #fecaca', borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#fff5f5', padding: '14px', color: '#991b1b', fontSize: '12px', fontWeight: '600' }}>
                ⚠ No Port Clearance found for the selected date.
              </div>
            )}
          </div>

          {/* ── Print Footer ── */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9ca3af' }}>
            <span>Manarah Sea Port Management System — Confidential</span>
            <span>Report_{report.vessel.name.replace(/\s+/g, '_')}_{report.date}.pdf</span>
            <span>Generated {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}
    </>
  );
}
