import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

interface ContainerData {
  id: number;
  port_of_loading: string;
  storage_type: string;
  consignee_name: string;
  manifest_file_path: string;
  extraction_status?: 'pending' | 'extracted' | 'incomplete' | 'failed' | string;
  extraction_errors?: string[] | null;
  error_reason?: string | null;
}

interface ManifestUploaderProps {
  vesselId: number | string;
  language: 'ar' | 'en';
  expectedContainers?: number | null;
  existingContainerCount?: number;
  existingContainers?: ContainerData[];
  onUploadSuccess?: (containers: ContainerData[]) => void;
  onContainerDeleted?: () => void;
  onAdjustCount?: () => void;
}

export function ManifestUploader({ vesselId, language, expectedContainers, existingContainerCount, existingContainers, onUploadSuccess, onContainerDeleted, onAdjustCount }: ManifestUploaderProps) {
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedContainers, setExtractedContainers] = useState<ContainerData[]>([]);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  const [manifestToDelete, setManifestToDelete] = useState<number | null>(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setUploadErrors([]); // Clear errors when initiating a new upload
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error(isRTL ? 'يرجى تحديد ملف واحد على الأقل' : 'Please select at least one file');
      return;
    }

    // Pre-upload container count mismatch check
    if (expectedContainers && expectedContainers > 0) {
      const totalAfterUpload = (existingContainerCount || 0) + selectedFiles.length;
      if (totalAfterUpload !== expectedContainers) {
        setShowMismatchModal(true);
        return;
      }
    }

    proceedWithUpload();
  };

  const proceedWithUpload = async () => {
    setShowMismatchModal(false);
    setIsUploading(true);
    
    const BATCH_SIZE = 50;
    const allSuccessful: any[] = [];
    const allFailed: any[] = [];
    const totalFiles = selectedFiles.length;
    setUploadProgress({ current: 0, total: totalFiles });
    
    try {
      // Split files into batches to avoid PHP max_file_uploads limit and timeouts
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = selectedFiles.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
        
        // Update progress toast
        if (totalBatches > 1) {
          toast.info(
            isRTL 
              ? `جاري معالجة الدفعة ${batchNumber} من ${totalBatches} (${Math.min(i + BATCH_SIZE, totalFiles)}/${totalFiles} ملف)...`
              : `Processing batch ${batchNumber} of ${totalBatches} (${Math.min(i + BATCH_SIZE, totalFiles)}/${totalFiles} files)...`,
            { autoClose: 2000, toastId: 'batch-progress' }
          );
        }

        const formData = new FormData();
        batch.forEach((file) => {
          formData.append('manifests[]', file);
        });

        const response = await api.post(`/arrival-notifications/${vesselId}/manifests`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 min timeout per batch
        });

        const successfulUploads = response.data.successful_uploads || response.data.results || [];
        const failedUploads = response.data.failed_uploads || [];

        allSuccessful.push(...successfulUploads);
        allFailed.push(...failedUploads);
        setUploadProgress({ current: Math.min(i + BATCH_SIZE, totalFiles), total: totalFiles });
      }

      toast.dismiss('batch-progress');
      toast.success(
        isRTL 
          ? `تم رفع ومعالجة ${allSuccessful.length} ملف بنجاح!` 
          : `${allSuccessful.length} files uploaded and processed successfully!`
      );
      
      const flattenedContainers = allSuccessful.map((r: any) => ({
        ...r.container,
        extraction_status: r.extraction_status,
        extraction_errors: r.extraction_errors,
        error_reason: r.error_reason
      }));

      setExtractedContainers(flattenedContainers);
      setUploadErrors(allFailed);
      setSelectedFiles([]);
      
      if (onUploadSuccess) {
        onUploadSuccess(flattenedContainers);
      }
    } catch (error: any) {
      console.error(error);
      toast.dismiss('batch-progress');
      const limitMsg = error.response?.status === 413 ? (isRTL ? 'حجم الملفات كبير جداً.' : 'Files are too large.') : '';
      toast.error(isRTL ? 'فشل في رفع ومعالجة الملفات. ' + limitMsg : 'Failed to upload and parse manifests. ' + limitMsg);
      
      // Even on error, show any partial results that succeeded
      if (allSuccessful.length > 0) {
        const flattenedContainers = allSuccessful.map((r: any) => ({
          ...r.container,
          extraction_status: r.extraction_status,
          extraction_errors: r.extraction_errors,
          error_reason: r.error_reason
        }));
        setExtractedContainers(flattenedContainers);
        setUploadErrors(allFailed);
        if (onUploadSuccess) {
          onUploadSuccess(flattenedContainers);
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDeleteManifest = async (id: number) => {
    try {
      await api.delete(`/agent/manifests/${id}`);
      setExtractedContainers(prev => prev.filter(c => c.id !== id));
      toast.info(isRTL ? 'تم حذف البيان بنجاح' : 'Manifest record deleted successfully');
      // Refresh parent to update existing containers list
      if (onContainerDeleted) onContainerDeleted();
    } catch (error) {
      toast.error(isRTL ? 'فشل حذف البيان' : 'Failed to delete manifest');
    } finally {
      setManifestToDelete(null);
    }
  };

  return (
    <div className={`bg-[var(--bg-card)] border border-secondary/30 rounded-xl p-6 ${isRTL ? 'rtl rtl-text-right' : 'ltr'} shadow-sm`}>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">
          {isRTL ? 'رفع ملفات بيان الحمولة' : 'Upload Cargo Manifests'}
        </h3>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {isRTL 
            ? 'قم برفع ملفات PDF أو الصور المتعددة لبيانات الحمولة. ستقوم الأنظمة باستخراج البيانات تلقائياً.' 
            : 'Upload multiple PDF or Image manifests. The system will autonomously extract payload categorizations.'}
        </p>
      </div>

      {/* Existing Manifests from DB */}
      {existingContainers && existingContainers.length > 0 && (
        <div className="mb-6 bg-[var(--bg-primary)]/30 border border-secondary/20 rounded-xl p-5">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {isRTL ? `البيانات المرفوعة (${existingContainers.length})` : `Uploaded Manifests (${existingContainers.length})`}
            {expectedContainers && expectedContainers > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${existingContainers.length === expectedContainers ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {existingContainers.length} / {expectedContainers}
              </span>
            )}
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            {existingContainers.map((container) => {
              const isFailed = container.extraction_status === 'failed' || container.extraction_status === 'incomplete';
              return (
                <div key={container.id} className={`flex items-center justify-between bg-[var(--bg-card)] border rounded-lg py-2.5 px-4 text-sm transition-all hover:border-primary/30 ${isFailed ? 'border-red-500/30 bg-red-500/5' : 'border-secondary/30'}`}>
                  <div className="flex items-center gap-3 truncate flex-1">
                    {isFailed ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> : <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    <span className={`truncate max-w-[180px] ${isFailed ? 'text-red-400 font-semibold' : 'text-[var(--text-primary)]'}`} title={container.manifest_file_path}>
                      {container.manifest_file_path.split('/').pop()}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${container.extraction_status === 'extracted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {container.extraction_status}
                    </span>
                    {container.consignee_name && <span className="text-xs text-[var(--text-secondary)] hidden md:inline">{container.consignee_name}</span>}
                  </div>
                  <button
                    onClick={() => setManifestToDelete(container.id)}
                    className="text-[var(--text-secondary)] hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-all active:scale-95 flex-shrink-0"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-5 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <strong className="text-red-500 font-semibold">{isRTL ? 'وثائق مرفوضة (لم يتم رفعها)' : 'Rejected Documents (Not Saved)'}</strong>
            <span className="text-red-400 text-sm">({uploadErrors.length})</span>
          </div>
          <ul className="space-y-3">
            {uploadErrors.map((err, i) => (
              <li key={i} className="bg-[var(--bg-card)] border border-red-500/20 rounded-lg p-3 text-sm shadow-sm">
                 <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                       <span className="text-[var(--text-primary)] font-semibold block mb-1">{err.file_name}</span>
                       <span className="text-red-400 text-xs font-medium">{err.error_reason}</span>
                    </div>
                 </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {extractedContainers.length === 0 && (
        <div className="space-y-6">
          {/* File Picker Area */}
          <div 
            className="border-2 border-dashed border-secondary rounded-xl p-10 flex flex-col items-center justify-center bg-[var(--bg-primary)]/50 hover:bg-primary/5 hover:border-primary/50 transition-colors cursor-pointer group shadow-inner"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-[var(--text-secondary)] group-hover:text-primary mb-4 transition-colors" />
            <h4 className="text-[var(--text-primary)] font-medium mb-1">
              {isRTL ? 'انقر أو اسحب الملفات هنا' : 'Click to select or drag manifests here'}
            </h4>
            <p className="text-[var(--text-secondary)] text-xs text-center max-w-sm">
              {isRTL ? 'يدعم صيغ: PDF, JPG, PNG' : 'Supports: PDF, JPG, PNG'}
            </p>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              multiple 
              accept=".pdf,.png,.jpeg,.jpg"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="bg-[var(--bg-primary)]/30 p-5 border border-secondary/20 rounded-xl">
              <h5 className="text-sm font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-secondary/20">
                {isRTL ? 'الملفات المحددة:' : 'Selected Manifests Queue:'}
              </h5>
              <ul className="space-y-2 mb-5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedFiles.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-[var(--bg-card)] border border-secondary/30 rounded-lg py-2.5 px-4 text-sm shadow-sm transition-all hover:border-primary/30">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px]" title={f.name}>{f.name}</span>
                      <span className="text-[var(--text-secondary)] text-xs">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button 
                      onClick={() => removeFile(idx)} 
                      className="text-red-400/80 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-all active:scale-95"
                      title={isRTL ? 'إزالة' : 'Remove'}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end pt-3 border-t border-secondary/20">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:to-blue-500 active:scale-[0.98] text-white rounded-lg font-semibold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadProgress.total > 0 
                        ? (isRTL ? `جاري المعالجة... ${uploadProgress.current}/${uploadProgress.total}` : `Processing... ${uploadProgress.current}/${uploadProgress.total} files`)
                        : (isRTL ? 'جاري الاستخراج...' : 'Crunching OCR...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {isRTL ? 'استخراج وتحليل البيانات' : 'Authenticate & Process Data'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Table (Shows independently after successful upload) */}
      {extractedContainers.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-2">
           <div className="flex items-center gap-3 mb-6 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl">
             <div className="bg-emerald-500/20 p-2 rounded-full">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
             </div>
             <div className="text-emerald-500 text-sm">
               <strong className="block font-semibold text-base mb-0.5">
                 {isRTL ? 'نجاح الاستخراج الآلي' : 'Autonomous Parsing Completed'}
               </strong>
               <span className="opacity-90">
                {isRTL 
                  ? `تم بنجاح تحليل وتسجيل ${extractedContainers.length} حاويات من المستندات.`
                  : `Securely verified and bridged ${extractedContainers.length} payload packages directly into the active Arrival Notification.`}
               </span>
             </div>
           </div>

           <div className="overflow-hidden rounded-xl border border-secondary/30 ring-1 ring-black/5 shadow-md">
             <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-[var(--bg-primary)] to-[var(--bg-card)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4 font-semibold border-b border-secondary/20">{isRTL ? 'المستند' : 'Source'}</th>
                    <th className="px-5 py-4 font-semibold border-b border-secondary/20">{isRTL ? 'ميناء الشحن' : 'Loading Port'}</th>
                    <th className="px-5 py-4 font-semibold border-b border-secondary/20">{isRTL ? 'المُرسل إليه' : 'Consignee'}</th>
                    <th className="px-5 py-4 font-semibold border-b border-secondary/20">{isRTL ? 'الحالة والفئة' : 'Status & Category'}</th>
                    <th className="px-5 py-4 font-semibold border-b border-secondary/20 text-center">{isRTL ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/10 bg-[var(--bg-primary)]/40">
                  {extractedContainers.map((container, idx) => {
                    const isFailed = container.extraction_status === 'failed' || container.extraction_status === 'incomplete';
                    return (
                      <tr key={idx} className={`hover:bg-[var(--bg-card)] transition-colors text-sm text-[var(--text-primary)] ${isFailed ? 'bg-red-500/5' : ''}`}>
                         <td className="px-5 py-4 truncate max-w-[180px]" title={container.manifest_file_path}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {isFailed ? (
                                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                )}
                                <span className={`truncate ${isFailed ? 'text-red-400 font-semibold' : ''}`}>
                                  {container.manifest_file_path.split('/').pop()}
                                </span>
                              </div>
                              {isFailed && container.error_reason && (
                                <div className="mt-1 flex flex-col gap-1">
                                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 mt-1">
                                      <span className="text-[11px] text-red-500 font-bold uppercase flex items-center gap-1 mb-0.5">
                                        <AlertCircle className="w-3 h-3" />
                                        {isRTL ? 'خطأ في الاستخراج' : 'Extraction Error'}
                                      </span>
                                      <p className="text-[10px] text-red-400 font-medium leading-tight">
                                        {container.error_reason}
                                      </p>
                                  </div>
                                </div>
                              )}
                            </div>
                         </td>
                         <td className="px-5 py-4 text-[var(--text-secondary)]">{container.port_of_loading || '---'}</td>
                         <td className="px-5 py-4 font-medium text-[var(--text-primary)]">{container.consignee_name || '---'}</td>
                         <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase
                                ${container.extraction_status === 'extracted' || container.extraction_status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}
                              `}>
                                {container.extraction_status}
                              </span>
                              <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase
                                ${container.storage_type === 'chemical' ? 'bg-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-500/30' : ''}
                                ${container.storage_type === 'frozen' ? 'bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/30' : ''}
                                ${container.storage_type === 'dry' ? 'bg-slate-500/10 text-slate-400 ring-1 ring-inset ring-slate-500/30' : ''}
                              `}>
                                {container.storage_type}
                              </span>
                            </div>
                         </td>
                         <td className="px-5 py-4 text-center">
                           <button 
                             onClick={() => setManifestToDelete(container.id)}
                             className="text-[var(--text-secondary)] hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 mb-1.5 transition-all text-sm active:scale-95"
                             title={isRTL ? 'حذف' : 'Delete'}
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
           </div>

           <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setExtractedContainers([])}
                className="flex items-center gap-2 px-5 py-2.5 border border-secondary/40 text-[var(--text-primary)] font-medium rounded-lg hover:bg-secondary/10 hover:border-secondary/60 transition-all text-sm active:scale-95"
              >
                 <UploadCloud className="w-4 h-4" />
                 {isRTL ? 'رفع الدفعة التالية' : 'Upload Another Batch'}
              </button>
           </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {manifestToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setManifestToDelete(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 text-center">
            {/* Warning Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
              {isRTL ? 'تأكيد حذف البيان' : 'Confirm Manifest Deletion'}
            </h3>
            
            {/* Description */}
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              {isRTL 
                ? 'هل أنت متأكد من حذف بيان الحمولة هذا؟ هذا الإجراء سيقوم بحذف البيان وكافة البيانات المرتبطة به نهائياً.' 
                : 'Are you sure you want to delete this manifest? This action will permanently delete the manifest and all associated data.'}
            </p>
            
            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setManifestToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => confirmDeleteManifest(manifestToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
              >
                {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Count Mismatch Warning Modal */}
      {showMismatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMismatchModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2 text-center">
              {isRTL ? 'تحذير: عدم تطابق عدد الحاويات' : 'Container Count Mismatch'}
            </h3>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{isRTL ? 'العدد المتوقع:' : 'Expected:'}</span>
                <span className="font-bold text-[var(--text-primary)]">{expectedContainers}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{isRTL ? 'المرفوع حالياً:' : 'Currently uploaded:'}</span>
                <span className="font-bold text-[var(--text-primary)]">{existingContainerCount || 0}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{isRTL ? 'قيد الرفع:' : 'About to upload:'}</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedFiles.length}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
                <span className="font-bold text-[var(--text-primary)]">{isRTL ? 'الإجمالي:' : 'Total:'}</span>
                <span className={`font-black ${((existingContainerCount || 0) + selectedFiles.length) !== (expectedContainers || 0) ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {(existingContainerCount || 0) + selectedFiles.length}
                </span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 text-center leading-relaxed">
              {isRTL
                ? 'عدد الحاويات المرفوعة لا يتطابق مع العدد المحدد في إشعار الوصول. يمكنك المتابعة أو تعديل العدد المتوقع.'
                : 'The total uploaded manifests will not match the expected container count specified in the arrival notification. You can proceed anyway or adjust the expected count.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setShowMismatchModal(false); onAdjustCount?.(); }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                {isRTL ? 'تعديل العدد' : 'Adjust Count'}
              </button>
              <button
                onClick={proceedWithUpload}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition-colors"
              >
                {isRTL ? 'متابعة على أي حال' : 'Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
