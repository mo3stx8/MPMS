import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { FileCheck, Ship, Clock, CheckCircle, AlertCircle, QrCode, X, Edit2, Download, RefreshCw, Lock } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { exportClearancePdf } from '../../utils/exportPdf';
import { Clearance } from '../../utils/portOfficerApi';
import { agentService, Vessel } from '../../services/agentService';
import { getTranslatedStatus } from '../../utils/formatters';
import { API_BASE_URL } from '@/services/api';


/** Anchorage statuses that mean a vessel has completed the anchoring phase */
const ANCHORED_STATUSES = ['wharf_assigned'] as const;

interface PortClearancesProps {
    language: Language;
}

export function PortClearances({ language }: PortClearancesProps) {
    const t = (translations[language] as any).agent?.clearances;
    const isRTL = language === 'ar';

    const [showIssueForm, setShowIssueForm] = useState(false);
    const [selectedVessel, setSelectedVessel] = useState('');
    const [nextPort, setNextPort] = useState('');
    const [selectedClearance, setSelectedClearance] = useState<Clearance | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [clearances, setClearances] = useState<Clearance[]>([]);
    const [availableVessels, setAvailableVessels] = useState<Pick<Vessel, 'id' | 'name'>[]>([]);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [processingDepartures, setProcessingDepartures] = useState<Record<string, boolean>>({});
    const [departedVessels, setDepartedVessels] = useState<Record<string, boolean>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const [clearancesData, vesselsData, anchorageData] = await Promise.all([
                agentService.getClearances(),
                agentService.getVessels(),
                agentService.getAnchorageRequests(),
            ]);
            setClearances(clearancesData);

            // ── Workflow Sequence Filter ────────────────────────────────────
            // Only vessels that have an APPROVED anchorage request
            // (status: 'wharf_assigned' | 'approved') are eligible for a
            // Port Clearance.  Vessels that only have an approved *arrival*
            // but have NOT yet progressed through the Anchorage phase are
            // deliberately excluded to enforce the pipeline:
            //   Arrival → Anchorage → Clearance
            const anchoredVesselIds = new Set<number>(
                anchorageData
                    .filter((a: any) => ANCHORED_STATUSES.includes(a.status))
                    .map((a: any) => a.vessel_id)
            );

            const eligibleVessels: Pick<Vessel, 'id' | 'name'>[] = (vesselsData as Vessel[])
                .filter((v) => v.current_wharf_id !== null && v.current_wharf_id !== undefined)
                .map((v) => ({ id: v.id, name: v.name }));
            // ───────────────────────────────────────────────────────────────

            setAvailableVessels(eligibleVessels);
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل بيانات التصاريح' : 'Failed to load clearances data');
            console.error('Error loading clearances:', error);
        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleIssueClearance = async () => {
        if ((!selectedVessel && !editingId) || !nextPort || issuing) return;

        setIssuing(true);
        try {
            if (editingId) {
                await agentService.updateClearance(editingId, nextPort);
                toast.success(isRTL ? 'تم تعديل التصريح بنجاح!' : 'Clearance updated successfully!');
            } else {
                await agentService.requestClearance(selectedVessel, nextPort);
                toast.success(isRTL ? 'تم طلب التصريح بنجاح!' : 'Clearance requested successfully!');
            }

            await loadData();

            setShowIssueForm(false);
            setSelectedVessel('');
            setNextPort('');
            setEditingId(null);
        } catch (error: any) {
            console.error('Error issuing clearance:', error);
            toast.error(error.response?.data?.message || error.message || (isRTL ? 'فشل طلب التصريح' : 'Failed to request clearance'));
        } finally {

            setIssuing(false);
        }
    };

    const getStatusLabel = (status: string) => {
        return getTranslatedStatus(status, language);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': 
            case 'clearance_approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending_clearance': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'expiring-soon': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'expired': 
            case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-secondary/50 text-[var(--text-secondary)] border-[var(--border-color)]';
        }
    };

    const handleDeparture = async (vesselId: string) => {
        setProcessingDepartures(prev => ({ ...prev, [vesselId]: true }));
        try {
            await agentService.executeDeparture(parseInt(vesselId));
            setDepartedVessels(prev => ({ ...prev, [vesselId]: true }));
            toast.success(isRTL ? 'تم تسجيل خروج السفينة بنجاح!' : 'Vessel departure executed successfully!');
            await loadData();
        } catch (error: any) {
            console.error('Error executing departure:', error);
            toast.error(error.response?.data?.message || (isRTL ? 'فشل تنفيذ الخروج' : 'Failed to execute departure'));
        } finally {
            setProcessingDepartures(prev => ({ ...prev, [vesselId]: false }));
        }
    };


    const viewQRCode = (clearance: Clearance) => {
        setSelectedClearance(clearance);
        setShowQRModal(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingIndicator type="line-spinner" size="md" label={isRTL ? 'جاري التحميل...' : 'Loading clearances...'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1 tracking-tight">
                        {t?.title || 'Port Clearances'}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-lg">
                        {t?.subtitle || 'Request and manage vessel departure clearances'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--surface-highlight)] hover:bg-secondary/20 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all font-semibold min-w-[100px]"
                    >
                        {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setSelectedVessel('');
                            setNextPort('');
                            setShowIssueForm(true);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-900 hover:bg-blue-800 text-[#F9F9F9] dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground rounded-xl shadow-lg shadow-blue-900/20 dark:shadow-primary/20 transition-all font-bold"
                    >
                        <FileCheck className="w-5 h-5" />
                        {t?.requestNew || 'Request New Clearance'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-base p-6 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">{t?.validClearances || 'Valid Clearances'}</p>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] mt-1">
                                {clearances.filter(c => c.status === 'valid').length}
                            </h2>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                    </div>
                </div>
                <div className="card-base p-6 border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">{t?.expiringSoon || 'Expiring Soon'}</p>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] mt-1">
                                {clearances.filter(c => c.status === 'expiring-soon').length}
                            </h2>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                    </div>
                </div>
                <div className="card-base p-6 border-l-4 border-l-red-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">{t?.expired || 'Expired'}</p>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] mt-1">
                                {clearances.filter(c => c.status === 'expired').length}
                            </h2>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clearances.map((clearance) => (
                    <div
                        key={clearance.id}
                        className="card-base p-6 hover:border-primary/30 transition-all"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${clearance.status === 'valid' ? 'bg-emerald-500/10 text-emerald-500' :
                                    clearance.status === 'expired' ? 'bg-red-500/10 text-red-500' :
                                        'bg-amber-500/10 text-amber-500'
                                    }`}>
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{clearance.clearanceId}</h3>
                                    <p className="text-[var(--text-secondary)] text-xs">{t?.requestId || 'Clearance ID'}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(clearance.status)}`}>
                                {getStatusLabel(clearance.status)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-[var(--surface-highlight)] rounded-xl border border-[var(--border-color)]">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                                    <Ship className="w-4 h-4" />
                                    <span className="text-xs">{t?.vessel || 'Vessel'}</span>
                                </div>
                                <div className="font-bold text-[var(--text-primary)]">{clearance.vessel}</div>
                            </div>
                            <div className="p-3 bg-[var(--surface-highlight)] rounded-xl border border-[var(--border-color)]">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs">{t?.timeRemaining || 'Time Remaining'}</span>
                                </div>
                                <div className={`font-bold ${clearance.hoursRemaining < 0 ? 'text-red-500' :
                                    clearance.hoursRemaining < 6 ? 'text-amber-500' :
                                        'text-emerald-500'
                                    }`}>
                                    {clearance.hoursRemaining < 0
                                        ? (isRTL ? 'منتهي' : 'Expired')
                                        : `${clearance.hoursRemaining}h`
                                    }
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] mb-1">{t?.issueTime || 'Issue Time'}</p>
                                <p className="text-sm text-[var(--text-primary)] font-medium">{clearance.issueTime}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] mb-1">{t?.expiryTime || 'Expiry Time'}</p>
                                <p className="text-sm text-[var(--text-primary)] font-medium">{clearance.expiryTime}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Destination: {clearance.nextPort}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingId(parseInt(clearance.id));
                                        setSelectedVessel(clearance.vessel);
                                        setNextPort(clearance.nextPort);
                                        setShowIssueForm(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition-all text-sm font-semibold"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    {isRTL ? 'تعديل' : 'Edit'}
                                </button>
                                <button
                                    onClick={() => viewQRCode(clearance)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-secondary/20 hover:bg-secondary/40 rounded-lg text-[var(--text-primary)] transition-all text-sm font-semibold"
                                >
                                    <QrCode className="w-4 h-4" />
                                    QR Code
                                </button>
                                <button
                                    onClick={() => {
                                        if (clearance.certificate_path) {
                                            window.open(`${API_BASE_URL}${clearance.certificate_path}`, '_blank');
                                        } else {
                                            exportClearancePdf({
                                                id: parseInt(clearance.id),
                                                status: clearance.status,
                                                issue_date: clearance.issueTime,
                                                expiry_date: clearance.expiryTime,
                                                next_port: clearance.nextPort,
                                                vessel: (clearance as any).vesselData || { name: clearance.vessel },
                                                officer: (clearance as any).officer || null,
                                            });
                                        }
                                    }}
                                    disabled={clearance.status !== 'clearance_approved'}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                                        clearance.status === 'clearance_approved'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed opacity-50'
                                    }`}
                                    title={isRTL ? 'تنزيل PDF' : 'Download PDF'}
                                >
                                    <Download className="w-4 h-4" />
                                    PDF
                                </button>
                                {clearance.status === 'clearance_approved' && clearance.certificate_path && (
                                    <button
                                        onClick={() => handleDeparture(clearance.vessel_id as string)}
                                        disabled={processingDepartures[clearance.vessel_id as string] || departedVessels[clearance.vessel_id as string] || clearance.vesselStatus === 'departed'}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all disabled:opacity-50 ${
                                            departedVessels[clearance.vessel_id as string]
                                            ? 'bg-[var(--surface-highlight)] text-[var(--text-disabled)] cursor-not-allowed border border-[var(--border-color)]'
                                            : 'bg-blue-900 hover:bg-blue-800 text-[#F9F9F9] dark:bg-accent dark:hover:bg-accent/90 dark:text-white shadow-md shadow-blue-900/20 dark:shadow-accent/20'
                                        }`}
                                    >
                                        {processingDepartures[clearance.vessel_id as string] ? (
                                            <LoadingIndicator type="line-spinner" size="xs" className="text-current" />
                                        ) : (
                                            <Ship className="w-4 h-4" />
                                        )}
                                        {processingDepartures[clearance.vessel_id as string] 
                                            ? (isRTL ? 'جاري التنفيذ...' : 'Processing...') 
                                            : (departedVessels[clearance.vessel_id as string] || clearance.vesselStatus === 'departed')
                                            ? (isRTL ? 'تم الخروج' : 'Departed') 
                                            : (isRTL ? 'خروج السفينة' : 'Vessel Get Out')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {clearances.length === 0 && (
                <div className="card-base p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                        <FileCheck className="w-10 h-10 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t?.noClearances || 'No clearances issued yet'}</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm">
                        {isRTL ? 'لم يتم إصدار أي تصاريح بعد. انقر على "طلب تصريح جديد" لإنشاء واحد.' : 'No clearances have been issued yet. Click "Request New Clearance" to create one.'}
                    </p>
                </div>
            )}

            {/* Request Modal */}
            {showIssueForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileCheck className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-[var(--text-primary)]">
                                    {editingId ? (isRTL ? 'تعديل التصريح' : 'Edit Port Clearance') : (t?.formTitle || 'New Port Clearance Request')}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowIssueForm(false)}
                                className="p-2 text-[var(--text-secondary)] hover:bg-secondary/20 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[var(--text-primary)] font-semibold mb-2">
                                    {t?.selectVessel || 'Select Vessel'}
                                </label>
                                <select
                                    value={selectedVessel}
                                    onChange={(e) => setSelectedVessel(e.target.value)}
                                    disabled={editingId !== null}
                                    className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                                >
                                    <option value="">
                                        {availableVessels.length === 0
                                            ? (isRTL ? 'لا توجد سفن جاهزة للتخليص' : 'No vessels eligible for clearance')
                                            : (t?.selectVesselPlaceholder || 'Select a vessel...')}
                                    </option>
                                    {editingId && !availableVessels.some(v => v.name === selectedVessel) && (
                                        <option value={selectedVessel}>{selectedVessel}</option>
                                    )}
                                    {availableVessels.map((vessel) => (
                                        <option key={vessel.id} value={vessel.name}>
                                            {vessel.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Show a hint when no vessels have completed the anchorage step */}
                                {availableVessels.length === 0 && !editingId && (
                                    <div className="mt-2 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-amber-600 dark:text-amber-400 text-xs font-medium leading-snug">
                                            {isRTL
                                                ? 'لا توجد سفن أكملت مرحلة الرسو بعد. يجب الموافقة على طلب الرسو أولاً قبل تقديم طلب التخليص.'
                                                : 'No vessels have completed the Anchorage phase yet. An Anchorage Request must be approved before a Port Clearance can be requested.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-semibold mb-2">
                                    {t?.nextPort || 'Next Port'}
                                </label>
                                <input
                                    type="text"
                                    value={nextPort}
                                    onChange={(e) => setNextPort(e.target.value)}
                                    placeholder={t?.nextPortPlaceholder || 'Enter next port name'}
                                    className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                                <p className="text-primary text-sm font-medium">
                                    {t?.autoGenerateNote || 'Clearance ID will be auto-generated as: PM.Mnarah.NO.{number}. Clearance valid for 24 hours from issue time.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--surface)] flex gap-3">
                            <button
                                onClick={() => {
                                    setShowIssueForm(false);
                                    setEditingId(null);
                                }}
                                className="flex-1 px-4 py-3 bg-secondary/20 hover:bg-secondary/40 text-[var(--text-primary)] font-bold rounded-xl transition-colors"
                            >
                                {t?.cancel || 'Cancel'}
                            </button>
                            <button
                                onClick={handleIssueClearance}
                                disabled={(!selectedVessel && !editingId) || !nextPort || issuing}
                                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {issuing ? (
                                    <LoadingIndicator type="line-spinner" size="xs" label={isRTL ? 'جاري التقديم...' : 'Submitting...'} className="text-white" />
                                ) : (
                                    <>
                                        <FileCheck className="w-5 h-5" />
                                        {editingId ? (isRTL ? 'تحديث' : 'Update') : (t?.submitRequest || 'Submit Request')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQRModal && selectedClearance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                            <h3 className="text-xl font-black text-[var(--text-primary)]">QR Code</h3>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="p-2 text-[var(--text-secondary)] hover:bg-secondary/20 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 pb-10 flex flex-col items-center">
                            <div className="w-48 h-48 bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-center">
                                <QrCode className="w-full h-full text-black" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)] text-lg mb-1">{selectedClearance.clearanceId}</p>
                            <p className="text-[var(--text-secondary)] mb-6">{selectedClearance.vessel}</p>

                            <button
                                onClick={() => setShowQRModal(false)}
                                className="w-full px-4 py-3 bg-secondary/20 hover:bg-secondary/40 text-[var(--text-primary)] font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
