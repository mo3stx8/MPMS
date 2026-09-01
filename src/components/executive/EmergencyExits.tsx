import { useState, useEffect } from 'react';
import { ShieldAlert, Clock, Ship, User, Search, FileText, Calendar, Filter, ArrowUpRight, History } from 'lucide-react';
import { executiveService, EmergencyExit } from '../../services/executiveService';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';

interface EmergencyExitsProps {
  language: Language;
  onNavigate?: (page: string, params?: any) => void;
}

export function EmergencyExits({ language, onNavigate }: EmergencyExitsProps) {
  const t = translations[language]?.executive || translations.en.executive;
  const commonT = translations[language]?.common || translations.en.common;
  const [exits, setExits] = useState<EmergencyExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadExits();
  }, []);

  const loadExits = async () => {
    setLoading(true);
    try {
      const data = await executiveService.getEmergencyExits();
      setExits(data);
    } catch (error) {
      console.error('Failed to load emergency exits', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExits = exits.filter(exit => 
    exit.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exit.imoNumber.includes(searchTerm) ||
    exit.agentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--bg-primary)]/40 backdrop-blur-md p-8 rounded-3xl border border-secondary/20 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20 transform hover:rotate-6 transition-transform">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-1">
              {language === 'ar' ? 'خروج السفن الاضطراري' : 'Emergency Vessel Exits'}
            </h1>
            <p className="text-[var(--text-secondary)] font-medium">
              {language === 'ar' ? 'مراقبة سحب السفن قبل الرسو' : 'Monitoring vessel withdrawals before anchorage'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث بالسفينة أو الوكيل...' : 'Search vessel or agent...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-[var(--background)] border border-secondary/50 rounded-2xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all min-w-[300px] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6 border-l-4 border-red-500 hover:scale-[1.02] transition-transform cursor-default">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-xs font-black text-red-500 uppercase tracking-widest">Total Exits</span>
          </div>
          <div className="text-4xl font-black text-[var(--text-primary)] mb-1">{exits.length}</div>
          <p className="text-[var(--text-secondary)] text-sm font-bold">Documented withdrawals</p>
        </div>

        <div className="card-base p-6 border-l-4 border-primary hover:scale-[1.02] transition-transform cursor-default">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-black text-primary uppercase tracking-widest">Last 24h</span>
          </div>
          <div className="text-4xl font-black text-[var(--text-primary)] mb-1">
            {exits.filter(e => new Date(e.exitTimestamp).getTime() > Date.now() - 86400000).length}
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-bold">Recent emergency departures</p>
        </div>

        <div className="card-base p-6 border-l-4 border-emerald-500 hover:scale-[1.02] transition-transform cursor-default">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <History className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="text-4xl font-black text-[var(--text-primary)] mb-1">100%</div>
          <p className="text-[var(--text-secondary)] text-sm font-bold">Audit trails maintained</p>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-[var(--bg-primary)]/40 backdrop-blur-md rounded-3xl border border-secondary/20 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-secondary/20 flex items-center justify-between bg-gradient-to-r from-transparent to-secondary/5">
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'سجل الانسحابات' : 'Withdrawal Logs'}
          </h2>
          <button className="btn-ghost text-xs uppercase font-black tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {language === 'ar' ? 'تصفية' : 'Filter'}
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <LoadingIndicator type="line-spinner" size="lg" label={language === 'ar' ? 'جاري تحميل البيانات...' : 'Fetching exit logs...'} />
            </div>
          ) : filteredExits.length === 0 ? (
            <div className="p-20 text-center">
              <Ship className="w-16 h-16 text-[var(--text-secondary)]/20 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-bold text-lg">
                {language === 'ar' ? 'لا توجد حالات خروج اضطراري مسجلة.' : 'No emergency exits recorded.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/5">
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{language === 'ar' ? 'السفينة' : 'Vessel'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{language === 'ar' ? 'الوكيل' : 'Agent'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{language === 'ar' ? 'التوقيت' : 'Timestamp'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{language === 'ar' ? 'سبب الخروج' : 'Exit Reason'}</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/10">
                {filteredExits.map((exit) => (
                  <tr key={exit.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--background)] flex items-center justify-center border border-secondary/30 group-hover:border-primary/50 transition-colors">
                          <Ship className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-[var(--text-primary)] font-black">{exit.vesselName}</div>
                          <div className="text-[var(--text-secondary)] text-xs font-bold">IMO: {exit.imoNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
                        <User className="w-4 h-4 text-[var(--text-secondary)]" />
                        {exit.agentName}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-bold">
                        <Calendar className="w-4 h-4" />
                        {new Date(exit.exitTimestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-md">
                      <div className="bg-red-500/5 text-red-500/80 p-3 rounded-xl border border-red-500/10 text-sm font-medium leading-relaxed italic">
                        "{exit.exitReason}"
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => onNavigate?.('vessel-history', { vesselId: exit.id })}
                        className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-all transform hover:scale-110"
                        title={language === 'ar' ? 'عرض السجل' : 'View History'}
                      >
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
