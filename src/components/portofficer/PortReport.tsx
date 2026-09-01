import { useState, useEffect } from 'react';
import { Language } from '../../App';
import { Ship, Calendar, Search, FileText, Download, CheckCircle } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { getVessels, getPortReport, Vessel, PortReportData } from '../../utils/portOfficerApi';
import { toast } from 'react-toastify';

interface PortReportProps {
  language: Language;
}

const PRINT_CSS = `
  @media print {
    @page { size: A4; margin: 25mm 20mm; }
    body * { visibility: hidden; }
    #port-official-report, #port-official-report * { visibility: visible; }
    #port-official-report {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      color: #000;
      background: #fff;
      font-family: var(--font-sans);
      line-height: 1.5;
    }
    .print-only { display: block !important; }
    .screen-only { display: none !important; }
    h1 { font-size: 20pt; text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; text-transform: uppercase; }
    h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .meta-item { border: 1px solid #ddd; padding: 10px; }
    .log-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .log-table th, .log-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 10pt; }
    .log-table th { background: #f2f2f2; }
    .status-box { border: 1px solid #000; padding: 15px; margin: 20px 0; }
    .signature-section { margin-top: 50px; border-top: 2px solid #000; padding-top: 20px; page-break-inside: avoid; }
    .signature-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .signature-line { border-bottom: 1px solid #000; width: 250px; display: inline-block; }
    .security-hash { font-size: 9pt; background: #eee; padding: 5px; margin-top: 10px; text-align: center; }
  }
`;

export function PortReport({ language }: PortReportProps) {
  const isRTL = language === 'ar';

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<PortReportData | null>(null);
  const [fetchingReport, setFetchingReport] = useState(false);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = PRINT_CSS;
    document.head.appendChild(styleTag);

    const loadVessels = async () => {
      try {
        const data = await getVessels();
        setVessels(data || []);
      } catch (error) {
        console.error('Failed to load vessels:', error);
        toast.error(isRTL ? 'فشل تحميل قائمة السفن' : 'Failed to load vessels list');
      }
    };
    loadVessels();

    return () => { document.head.removeChild(styleTag); };
  }, []);

  const handleFetchReport = async () => {
    if (!selectedVessel || !targetDate) return;
    setFetchingReport(true);
    try {
      const data = await getPortReport(selectedVessel, targetDate);
      setReport(data);
    } catch (error) {
      toast.error(isRTL ? 'فشل جلب التقرير' : 'Failed to fetch report');
    } finally {
      setFetchingReport(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    window.print();
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{isRTL ? 'التقرير التنظيمي للميناء' : 'Regulatory Port Report'}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRTL ? 'استخراج تقارير رسمية معتمدة' : 'Generate official certified reports'}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <Ship className="w-3.5 h-3.5" />{isRTL ? 'اسم السفينة' : 'Vessel Name'}
            </label>
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors"
            >
              <option value="">{isRTL ? '— اختر سفينة —' : '— Select a Vessel —'}</option>
              {vessels.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الهدف' : 'Target Date'}
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors"
            />
          </div>

          <button
            onClick={handleFetchReport}
            disabled={fetchingReport || !selectedVessel}
            className="bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[140px] justify-center"
          >
            {fetchingReport ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <><Search className="w-4 h-4" />{isRTL ? 'عرض التقرير' : 'View Report'}</>}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {report ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              {isRTL ? 'تم إنشاء التقرير' : 'Report Synthesized Successfully'}
            </div>
            <button onClick={handlePrint} className="bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />{isRTL ? 'استخراج PDF' : 'Extract as PDF'}
            </button>
          </div>

          {/* Print-ready Report */}
          <div id="port-official-report" className="bg-white p-10 shadow-xl rounded border text-black mx-auto">
            <h1 className="text-3xl font-black text-center mb-8 border-b-4 border-black pb-4 uppercase tracking-tighter">
              Official Port Activity & Regulatory Report
            </h1>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-4">
                <div className="border-l-2 border-black pl-4">
                  <p className="text-xs uppercase font-black text-gray-500">Vessel Identity</p>
                  <p className="text-xl font-black">{report.vessel.name}</p>
                  <p className="text-sm font-bold">IMO: {report.vessel.imo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-black text-gray-500">Vessel Particulars</p>
                  <p className="font-bold">Type: {report.vessel.type}</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase font-black text-gray-500">Document Schedule</p>
                  <p className="text-xl font-bold">DATE: {report.date}</p>
                </div>
                <div className="inline-block px-3 py-1 bg-black text-white text-xs font-black uppercase tracking-widest self-end">Administrative Record</div>
              </div>
            </div>

            <section className="mb-10">
              <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-wide">1. Port Clearance Status</h2>
              {report.clearance ? (
                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 border border-gray-200">
                  <div><p className="text-xs uppercase font-bold text-gray-500">Clearance Identifier</p><p className="text-lg font-black">{report.clearance.clearance_id}</p></div>
                  <div><p className="text-xs uppercase font-bold text-gray-500">Official Status</p><p className="text-lg font-black text-emerald-700">{report.clearance.status.toUpperCase()}</p></div>
                  <div><p className="text-xs uppercase font-bold text-gray-500">Next Destination</p><p className="font-black">{report.clearance.next_port}</p></div>
                  <div>
                    <p className="text-xs uppercase font-bold text-gray-500">Issue/Expiry</p>
                    <p className="font-bold">Issued: {report.clearance.issue_date.split(' ')[0]}</p>
                    <p className="font-bold">Expiry: {report.clearance.expiry_date.split(' ')[0]}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 text-gray-500 italic">No Port Clearance data recorded for the selected vessel on this target date.</div>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-wide">2. Wharfage & Berthing Chronology</h2>
              {report.wharfage.length > 0 ? (
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-3 text-left uppercase text-xs font-black tracking-widest">Wharf/Berth</th>
                      <th className="border border-black p-3 text-left uppercase text-xs font-black tracking-widest">Time In</th>
                      <th className="border border-black p-3 text-left uppercase text-xs font-black tracking-widest">Time Out</th>
                      <th className="border border-black p-3 text-left uppercase text-xs font-black tracking-widest">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.wharfage.map((log, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-3 font-bold">{log.wharf}</td>
                        <td className="border border-black p-3 text-sm">{log.time_in}</td>
                        <td className="border border-black p-3 text-sm">{log.time_out}</td>
                        <td className="border border-black p-3 font-bold text-center">{log.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 text-gray-600 font-bold uppercase tracking-tight text-center">No Wharfage or Clearance Activity Recorded for this Period</div>
              )}
            </section>

            <section className="signature-section mt-20 pt-10 border-t-4 border-black">
              <h3 className="text-lg font-black mb-6 uppercase tracking-widest">Validation & Authorization Section</h3>
              <div className="flex justify-between gap-10 mb-12">
                <div className="space-y-6 flex-1">
                  <div>
                    <p className="text-xs uppercase font-black text-gray-500 mb-1">Authenticated Port Officer</p>
                    <p className="text-lg font-black border-b border-black pb-1 inline-block min-w-[200px]">{report.officer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-black text-gray-500 mb-1">Extraction Timestamp</p>
                    <p className="text-sm font-black border-b border-black pb-1 inline-block min-w-[200px]">{report.timestamp}</p>
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <div className="inline-block text-left w-full max-w-[250px]">
                    <p className="text-xs uppercase font-black text-gray-500 mb-12">Verified and Signed by Port Officer</p>
                    <div className="border-b-2 border-black w-full h-1" />
                    <p className="text-[10px] mt-1 italic text-gray-400">Official Signature / Stamp Area</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-4 border border-gray-300">
                <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest text-center">System Integration Authentication Code</p>
                <div className="security-hash text-center text-sm font-bold tracking-tighter">{report.security_hash}</div>
              </div>
              <p className="text-[8px] text-gray-400 mt-2 text-center uppercase tracking-widest">
                This document is generated by the Manarah Sea Port Management System and serves as a primary record of regulatory compliance.
              </p>
            </section>
          </div>
        </div>
      ) : selectedVessel && !fetchingReport ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-16 text-center">
          <FileText className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{isRTL ? 'اختر معايير التقرير واضغط "عرض"' : 'Select report criteria and click "View"'}</p>
        </div>
      ) : null}
    </div>
  );
}
