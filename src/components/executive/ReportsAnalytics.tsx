import { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { executiveService } from '../../services/executiveService';

interface ReportsAnalyticsProps {
  language: Language;
}

export function ReportsAnalytics({ language }: ReportsAnalyticsProps) {
  const t = translations[language]?.executive?.reports || translations.en.executive.reports;

  const [turnaroundData, setTurnaroundData] = useState<any[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [reportType, setReportType] = useState('Performance');
  const [format, setFormat] = useState('PDF');
  const [totalRejectionsCount, setTotalRejectionsCount] = useState(0);
  const [averageTurnaroundTime, setAverageTurnaroundTime] = useState(0);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await executiveService.getAnalytics();
      if (data) {
        const mappedTurnaround = data.turnaroundData.map((item: any) => ({ period: item.name, hours: item.avg }));
        setTurnaroundData(mappedTurnaround);

        const avgTurnaroundVal = mappedTurnaround.length > 0 
          ? mappedTurnaround.reduce((acc: number, curr: any) => acc + curr.hours, 0) / mappedTurnaround.length 
          : 0;
        setAverageTurnaroundTime(Number(avgTurnaroundVal.toFixed(1)));

        const totalRejs = data.rejectionReasons.reduce((acc: number, item: any) => acc + item.value, 0);
        setTotalRejectionsCount(totalRejs);

        setRejectionReasons(data.rejectionReasons.map((item: any) => ({
          reason: item.name,
          count: item.value,
          percentage: totalRejs > 0 ? Math.round((item.value / totalRejs) * 100) : 0,
          color: item.color
        })));

        setHeatmapData(data.heatmapData || []);

        setPerformanceMetrics([
          { title: t.avgTurnaroundTime, value: data.performanceMetrics.avgTurnaround, change: '-12%', trend: 'down', good: true, icon: Clock, color: 'text-blue-700 dark:text-blue-400', borderColor: 'border-b-blue-500 dark:border-b-blue-400' },
          { title: t.approvalRate, value: data.performanceMetrics.approvalRate, change: '+5%', trend: 'up', good: true, icon: CheckCircle2, color: 'text-green-700 dark:text-green-400', borderColor: 'border-b-green-500 dark:border-b-green-400' },
          { title: t.rejectionRate, value: (100 - parseInt(data.performanceMetrics.approvalRate)) + '%', change: '-3%', trend: 'down', good: true, icon: XCircle, color: 'text-red-700 dark:text-red-400', borderColor: 'border-b-red-500 dark:border-b-red-400' },
          { title: t.dailyDecisions, value: data.performanceMetrics.dailyDecisions?.toString() || '0', change: '+15%', trend: 'up', good: true, icon: BarChart3, color: 'text-slate-900 dark:text-slate-50', borderColor: 'border-b-slate-400 dark:border-b-slate-500' },
        ]);

        setRecentReports(data.recentReports.map((report: any) => ({
          name: report.title,
          date: report.date,
          type: report.type,
          size: report.size,
          file_url: report.file_url || '#'
        })));
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, [language]);

  const handleGenerate = async (paramsOverride?: { dateRange: string, reportType: string, format: string }) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await executiveService.generateCustomReport({
        dateRange: paramsOverride?.dateRange || dateRange,
        reportType: paramsOverride?.reportType || reportType,
        format: paramsOverride?.format || format
      });
      if (response && response.report) {
        const newReport = { name: response.report.title, date: response.report.date, type: response.report.type, size: response.report.size, file_url: response.report.file_url };
        setRecentReports((prev) => [newReport, ...prev].slice(0, 3));
        const a = document.createElement('a');
        a.href = response.report.file_url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setError('Error: Unexpected response format from server.');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      if (error.response?.status === 500) setError('Error: Unable to connect to reporting service (Server Error).');
      else if (error.response?.status === 400 || error.response?.status === 422) setError('Error: Invalid data parameters submitted.');
      else setError(error.message || 'Failed to generate report due to a network or connection error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = (expFormat: string) => {
    handleGenerate({ dateRange: 'Last 30 Days', reportType: 'Comprehensive', format: expFormat });
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator 
          type="line-spinner" 
          size="lg" 
          label={language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading analytics...'} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportReport('PDF')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors">
            <Download className="w-4 h-4" />PDF
          </button>
          <button onClick={() => exportReport('Excel')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors">
            <Download className="w-4 h-4" />Excel
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={metric.title} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-4 ${metric.borderColor} rounded-lg p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${metric.good ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  <TrendIcon className="w-3.5 h-3.5" />{metric.change}
                </div>
              </div>
              <div className={`text-2xl font-bold mb-1 ${metric.color}`}>{metric.value}</div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">{metric.title}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnaround Time Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.turnaroundTimeChart}</h2>
          <div className="space-y-4">
            {turnaroundData.map((data, index) => {
              const maxHours = Math.max(...turnaroundData.map(d => d.hours), 1);
              return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{data.period}</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium text-sm">{data.hours}h</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((data.hours / maxHours) * 100, 100)}%` }} />
                </div>
              </div>
            )})}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{t.average}</div>
            <div className="text-blue-700 dark:text-blue-400 font-bold">{averageTurnaroundTime} {t.hours}</div>
          </div>
        </div>

        {/* Rejection Reasons Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.rejectionReasonsChart}</h2>
          <div className="space-y-4">
            {rejectionReasons.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{item.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs">{item.count}</span>
                    <span className="text-slate-900 dark:text-slate-50 font-medium text-sm">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
            <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{t.totalRejections}</div>
            <div className="text-red-700 dark:text-red-400 font-bold">{totalRejectionsCount}</div>
          </div>
        </div>
      </div>

      {/* Decision Timeline Heatmap */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.decisionTimeline}</h2>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, weekIndex) => (
            <div key={weekIndex} className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400 text-xs text-center mb-2">
                {language === 'ar' ? `أسبوع ${weekIndex + 1}` : `Week ${weekIndex + 1}`}
              </div>
              {[...Array(5)].map((_, dayIndex) => {
                const decisions = heatmapData[weekIndex] ? (heatmapData[weekIndex][dayIndex] || 0) : 0;
                const maxDecisions = Math.max(1, ...heatmapData.flat());
                const intensity = decisions > 0 ? Math.min(decisions / maxDecisions, 1) : 0;
                return (
                  <div
                    key={dayIndex}
                    className="h-7 rounded transition-all hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: `rgba(30, 58, 138, ${intensity > 0 ? intensity * 0.7 + 0.3 : 0.05})` }}
                    title={`${decisions} ${t.decisions}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          {[
            { label: t.low, bg: 'rgba(30, 58, 138, 0.15)' },
            { label: t.medium, bg: 'rgba(30, 58, 138, 0.35)' },
            { label: t.high, bg: 'rgba(30, 58, 138, 0.6)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.bg }} />
              <span className="text-slate-500 dark:text-slate-400 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.recentReports}</h2>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Download className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{report.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{report.date} • {report.type} • {report.size}</div>
                </div>
              </div>
              <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors">
                {t.download}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Export */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">{t.customExport}</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              label: t.dateRange, value: dateRange, setter: setDateRange,
              options: [{ value: 'Last 7 Days', label: t.last7Days }, { value: 'Last 30 Days', label: t.last30Days }, { value: 'Last Month', label: t.lastMonth }, { value: 'Custom', label: t.custom }]
            },
            {
              label: t.reportType, value: reportType, setter: setReportType,
              options: [
                { value: 'Performance', label: t.performance },
                { value: 'Operational', label: t.operational },
                { value: 'Rejections', label: t.rejections },
                { value: 'Comprehensive', label: t.comprehensive }
              ]
            },
            {
              label: t.format, value: format, setter: setFormat,
              options: [{ value: 'PDF', label: 'PDF' }, { value: 'Excel', label: 'Excel' }, { value: 'CSV', label: 'CSV' }]
            },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{field.label}</label>
              <select value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors">
                {field.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button onClick={() => handleGenerate()} disabled={isGenerating} className="mt-4 w-full py-3 bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
          {isGenerating ? <LoadingIndicator type="line-spinner" size="xs" label={language === 'ar' ? 'جاري الإنشاء...' : 'Generating...'} className="text-white" /> : t.generateReport}
        </button>
      </div>
    </div>
  );
}
