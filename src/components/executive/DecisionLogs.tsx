import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { executiveService } from '../../services/executiveService';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';

import { CheckCircle2, XCircle, Info, Search, Filter, Download, Calendar, User as UserIcon } from 'lucide-react';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { getTranslatedStatus } from '../../utils/formatters';

interface DecisionLogsProps {
  language: Language;
}

export function DecisionLogs({ language }: DecisionLogsProps) {
  const t = translations[language]?.executive?.logs || translations.en.executive.logs;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState('Last 7 Days');
  const [exportType, setExportType] = useState('All');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await executiveService.getLogs();
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch decision logs", error);
        toast.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [language]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.vessel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.agent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || log.decision === filterStatus;
    const matchesType = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getDecisionBadge = (decision: string) => {
    if (decision === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (decision === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      arrival: { ar: 'وصول', en: 'Arrival' },
      anchorage: { ar: 'رسو', en: 'Anchorage' },
    };
    return labels[type]?.[language] || type;
  };

  const getDecisionLabel = (decision: string) => {
    return getTranslatedStatus(decision, language);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await executiveService.generateCustomReport({
        dateRange: exportDateRange,
        reportType: 'DecisionLogs',
        format: 'PDF',
        decisionType: exportType.toLowerCase()
      });
      if (response && response.report && response.report.file_url) {
        const a = document.createElement('a');
        a.href = response.report.file_url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShowExportModal(false);
        toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
      } else {
        toast.error('Export failed: Unexpected response');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator type="line-spinner" size="lg" label={language === 'ar' ? 'جاري تحميل السجلات...' : 'Loading decision logs...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
        </div>
        <button onClick={() => setShowExportModal(true)} className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />{t.export}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.totalDecisions, value: logs.length, textColor: 'text-slate-900 dark:text-slate-50', borderColor: 'border-b-slate-400' },
          { label: t.approved, value: logs.filter(l => l.decision === 'approved').length, textColor: 'text-green-700 dark:text-green-400', borderColor: 'border-b-green-500 dark:border-b-green-400' },
          { label: t.rejected, value: logs.filter(l => l.decision === 'rejected').length, textColor: 'text-red-700 dark:text-red-400', borderColor: 'border-b-red-500 dark:border-b-red-400' },
          { label: t.approvalRate, value: logs.length > 0 ? `${Math.round((logs.filter(l => l.decision === 'approved').length / logs.length) * 100)}%` : '0%', textColor: 'text-blue-700 dark:text-blue-400', borderColor: 'border-b-blue-500 dark:border-b-blue-400' },
        ].map((item) => (
          <div key={item.label} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-4 ${item.borderColor} rounded-lg p-4 shadow-sm`}>
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{item.label}</div>
            <div className={`text-2xl font-bold ${item.textColor}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full ${language === 'ar' ? 'pr-10' : 'pl-10'} py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors">
              <option value="all">{t.allDecisions}</option>
              <option value="approved">{t.approved}</option>
              <option value="rejected">{t.rejected}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors">
              <option value="all">{t.allTypes}</option>
              <option value="arrival">{t.arrivals}</option>
              <option value="anchorage">{t.anchorage}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/25 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {[t.requestId, t.type, t.vessel, t.decision, t.decidedBy, t.timestamp].map((col) => (
                  <th key={col} className={`px-5 py-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors">
                  <td className="px-5 py-4"><span className="text-slate-900 dark:text-slate-50 font-medium font-mono text-sm">{log.id}</span></td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{getTypeLabel(log.type)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{log.vessel}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{log.agent}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getDecisionBadge(log.decision)}`}>
                      {log.decision === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {log.decision === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {log.decision === 'info' && <Info className="w-3.5 h-3.5" />}
                      {getDecisionLabel(log.decision)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-sm">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />{log.decidedBy}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
                      <Calendar className="w-3.5 h-3.5" />{log.timestamp}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-10"><p className="text-slate-500 dark:text-slate-400 text-sm">{t.noResults}</p></div>
        )}
      </div>

      {/* Justification Details */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.recentJustifications}</h2>
        <div className="space-y-3">
          {filteredLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-slate-50 font-medium text-sm">{log.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getDecisionBadge(log.decision)}`}>
                    {log.decision === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {getDecisionLabel(log.decision)}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-xs">{log.timestamp}</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mb-2">{log.vessel} - {log.agent}</div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t.justification}:</div>
                <div className="text-slate-900 dark:text-slate-50 text-sm">{log.justification}</div>
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mt-2">{t.decidedBy}: {log.decidedBy}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">{t.export}</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {language === 'ar' ? 'نطاق التاريخ' : 'Date Range'}
                </label>
                <select value={exportDateRange} onChange={e => setExportDateRange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20">
                  <option value="Last 7 Days">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
                  <option value="Last 30 Days">{language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days'}</option>
                  <option value="Last Month">{language === 'ar' ? 'الشهر الماضي' : 'Last Month'}</option>
                  <option value="This Year">{language === 'ar' ? 'هذا العام' : 'This Year'}</option>
                  <option value="All Time">{language === 'ar' ? 'كل الوقت' : 'All Time'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {language === 'ar' ? 'نوع القرار' : 'Decision Type'}
                </label>
                <select value={exportType} onChange={e => setExportType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20">
                  <option value="All">{language === 'ar' ? 'كل القرارات' : 'All Decisions'}</option>
                  <option value="Approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</option>
                  <option value="Rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                </select>
              </div>
            </div>
            <div className={`px-6 py-4 bg-slate-50 dark:bg-slate-700/25 border-t border-slate-200 dark:border-slate-700 flex ${language === 'ar' ? 'justify-start' : 'justify-end'} gap-3`}>
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleExport} disabled={exporting} className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {exporting ? <LoadingIndicator type="line-spinner" size="xs" label="" /> : <Download className="w-4 h-4" />}
                {exporting ? (language === 'ar' ? 'جاري التحميل...' : 'Generating...') : (language === 'ar' ? 'تحميل PDF' : 'Download PDF')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
