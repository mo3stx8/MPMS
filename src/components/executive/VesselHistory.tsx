import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ArrowLeft, Anchor, FileText, Ship, Info, Calendar, Loader2, Clock, CheckCircle2, XCircle, Search, Navigation, Package, Hash, LogIn, LogOut, ChevronDown, SortDesc } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { translations } from '../../utils/translations';
import { executiveService } from '../../services/executiveService';
import { getTranslatedStatus, getTranslatedVesselType } from '../../utils/formatters';
import { echo } from '../../utils/echo';
import { Radio } from 'lucide-react';

interface VesselHistoryProps {
  language: Language;
  vesselId: string | number;
  onNavigate: (page: string) => void;
}

interface VesselRecord {
  id: number;
  name: string;
  imo_number: string;
  type: string;
  flag: string;
  status: string;
}

export function VesselHistory({ language, vesselId, onNavigate }: VesselHistoryProps) {
  const t = (translations[language]?.executive as any)?.history || {
    title: 'Vessel History',
    subtitle: 'Comprehensive chronicle of all port calls and operational interactions',
    back: 'Back to Dashboard',
    masterRecord: 'Master Record',
    imo: 'IMO Number',
    flag: 'Flag State',
    type: 'Vessel Type',
    tonnage: 'Gross Tonnage',
    history: 'Historical Timeline',
    loadMore: 'Load More',
    noHistory: 'No historical port calls found. First recorded entry.',
    error: 'Failed to load vessel profile',
    status: 'Status',
    date: 'Date & Time',
    searchPlaceholder: 'Search by IMO Number (e.g. 9876543)',
    search: 'Search',
    arrivalDate: 'Arrival Date',
    departureDate: 'Expected Departure',
    cargoType: 'Cargo Type',
    previousPort: 'Previous Port',
    totalArrivals: 'Total Arrivals',
    totalDepartures: 'Total Clearances'
  };

  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vesselData, setVesselData] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeVesselId, setActiveVesselId] = useState<string | number>(vesselId);
  const [searchQuery, setSearchQuery] = useState('');

  // Vessel selector state (when no vesselId is provided)
  const [showSelector, setShowSelector] = useState(!vesselId);
  const [vesselList, setVesselList] = useState<VesselRecord[]>([]);
  const [vesselSearchText, setVesselSearchText] = useState('');
  const [loadingVessels, setLoadingVessels] = useState(false);
  const [vesselSearchDebounce, setVesselSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  // Sort history items chronologically by timestamp (descending, newest first)
  const sortHistoryByDate = useCallback((items: any[]) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA; // Descending: newest first
    });
  }, []);

  // Sorted history items (memoized)
  const sortedHistoryItems = useMemo(() => {
    return sortHistoryByDate(historyItems);
  }, [historyItems, sortHistoryByDate]);

  // Fetch vessel list for the selector
  const fetchVesselList = useCallback(async (search?: string) => {
    setLoadingVessels(true);
    try {
      const data = await executiveService.getAllVessels(search);
      setVesselList(data.data || []);
    } catch (err) {
      console.error('Error fetching vessel list:', err);
      setVesselList([]);
    } finally {
      setLoadingVessels(false);
    }
  }, []);

  // Load vessel list on mount if no vesselId
  useEffect(() => {
    if (!vesselId) {
      fetchVesselList();
    }
  }, [vesselId, fetchVesselList]);

  // Debounced vessel search
  useEffect(() => {
    if (!showSelector) return;
    if (vesselSearchDebounce) clearTimeout(vesselSearchDebounce);
    const timeout = setTimeout(() => {
      fetchVesselList(vesselSearchText || undefined);
    }, 300);
    setVesselSearchDebounce(timeout);
    return () => clearTimeout(timeout);
  }, [vesselSearchText, showSelector]);

  const fetchHistory = async (targetPage: number, vid: string | number) => {
    try {
      const data = await executiveService.getVesselHistory(vid, targetPage);
      
      if (targetPage === 1) {
        setVesselData(data.vessel);
        setHistoryItems(data.history.data);
      } else {
        setHistoryItems(prev => [...prev, ...data.history.data]);
      }
      
      setHasMore(data.history.current_page < data.history.last_page);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      if (err.response?.status === 404) {
        setError(isRTL ? 'لم يتم العثور على بيانات السفينة' : 'Vessel not found in database');
      } else {
        setError(t.error);
      }
    }
  };

  useEffect(() => {
    setActiveVesselId(vesselId);
  }, [vesselId]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError(null);
      setShowSelector(false);
      await fetchHistory(1, activeVesselId);
      setLoading(false);
    };
    if (activeVesselId) {
      initialize();
    } else {
      setShowSelector(true);
    }
  }, [activeVesselId]);

  // Real-time Echo listener
  useEffect(() => {
    if (!activeVesselId) return;
    const channel = echo.channel('port-operations');
    const handler = (event: any) => {
      if (String(event.vessel_id) === String(activeVesselId)) {
        setHistoryItems(prev => [event, ...prev]);
        setLiveCount(c => c + 1);
        setTimeout(() => setLiveCount(c => Math.max(0, c - 1)), 5000);
      }
    };
    channel.listen('.vessel.operation.logged', handler);
    return () => { channel.stopListening('.vessel.operation.logged', handler); };
  }, [activeVesselId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveVesselId(searchQuery.trim());
    }
  };

  const handleSelectVessel = (vessel: VesselRecord) => {
    setActiveVesselId(vessel.id);
    setShowSelector(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchHistory(nextPage, activeVesselId);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getEventIcon = (type: string) => {
    if (type.includes('Registration') || type.includes('Arrival')) return <Ship className="w-4 h-4 text-blue-700 dark:text-blue-400" />;
    if (type.includes('Cargo')) return <FileText className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />;
    if (type.includes('Wharfage')) return <Anchor className="w-4 h-4 text-amber-700 dark:text-amber-400" />;
    if (type.includes('Clearance')) return <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
    return <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-900/30';
      case 'pending':
        return 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-900/30';
      case 'rejected':
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-900/30';
      default:
        return 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-900/30';
    }
  };

  const getVesselStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'awaiting': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'berthed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // ─── Vessel Selector View ────────────────────────────────────────────
  if (showSelector && !loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 p-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="p-3 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all group"
            >
              <ArrowLeft className={`w-5 h-5 group-hover:-translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">{t.title}</h1>
              <p className="text-slate-500 dark:text-slate-400">{isRTL ? 'اختر سفينة لعرض سجلها التاريخي' : 'Select a vessel to view its historical record'}</p>
            </div>
          </div>
        </div>

        {/* Vessel Search & Selector */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <Ship className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {isRTL ? 'اختر سفينة' : 'Select a Vessel'}
            </h3>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]`} />
            <input
              type="text"
              value={vesselSearchText}
              onChange={(e) => setVesselSearchText(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم أو رقم IMO...' : 'Search by vessel name or IMO number...'}
              className={`w-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-3.5 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-primary transition-colors text-base`}
            />
          </div>

          {/* Vessel List */}
          {loadingVessels ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-[var(--text-secondary)]">{isRTL ? 'جاري تحميل السفن...' : 'Loading vessels...'}</p>
            </div>
          ) : vesselList.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--surface)]">
              <Ship className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium text-lg">
                {isRTL ? 'لا توجد سفن مسجلة' : 'No vessels found'}
              </p>
              <p className="text-[var(--text-secondary)]/70 text-sm mt-2">
                {isRTL ? 'حاول تعديل كلمات البحث' : 'Try adjusting your search terms'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {vesselList.map((vessel) => (
                <button
                  key={vessel.id}
                  onClick={() => handleSelectVessel(vessel)}
                  className="text-left p-5 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] hover:border-primary rounded-xl transition-all group transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Ship className="w-5 h-5 text-primary" />
                      <span className="text-[var(--text-primary)] font-bold text-base truncate max-w-[140px]">{vessel.name}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getVesselStatusColor(vessel.status)}`}>
                      {getTranslatedStatus(vessel.status, language)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Hash className="w-3.5 h-3.5" />
                      <span>IMO: {vessel.imo_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Info className="w-3.5 h-3.5" />
                      <span>{getTranslatedVesselType(vessel.type, language)} • {vessel.flag || '🏳️'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {isRTL ? 'عرض السجل' : 'View History'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-primary -rotate-90 ${isRTL ? 'rotate-90' : ''} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator 
          type="line-spinner" 
          size="lg" 
          label={language === 'ar' ? 'جاري تحميل ملف السفينة...' : 'Loading comprehensive vessel profile...'} 
        />
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { setError(null); setShowSelector(true); setActiveVesselId(''); }}
            className="px-6 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary font-bold transition-all"
          >
            {isRTL ? 'اختر سفينة أخرى' : 'Select Another Vessel'}
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all"
          >
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main History View ───────────────────────────────────────────────
  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Page Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setShowSelector(true); setActiveVesselId(''); setVesselData(null); setHistoryItems([]); }}
            className="p-3 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all group"
            title={isRTL ? 'اختر سفينة أخرى' : 'Select Another Vessel'}
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* IMO Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg py-2.5 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm shadow-sm`}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            {t.search}
          </button>
        </form>
      </div>

      {/* Master Record */}
      {vesselData && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 dark:bg-blue-500" />
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <Ship className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{vesselData.vesselName || vesselData.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-1"><Info className="w-4 h-4"/> ID: {vesselData.id}</span>
                <span className="flex items-center gap-1"><Info className="w-4 h-4"/> {t.imo}: {vesselData.imo}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{t.flag}</div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-base line-clamp-1">{vesselData.flag}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{t.type}</div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-base line-clamp-1">{getTranslatedVesselType(vesselData.type, language)}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Hash className="w-3.5 h-3.5" />{t.imo}
              </div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-base line-clamp-1">{vesselData.imoNumber || vesselData.imo}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Package className="w-3.5 h-3.5" />{t.cargoType}
              </div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-base line-clamp-1">{vesselData.cargoType || 'N/A'}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Navigation className="w-3.5 h-3.5" />{t.previousPort}
              </div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-base line-clamp-1">{vesselData.previousPort || 'N/A'}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />{t.arrivalDate}
              </div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-sm line-clamp-1">{vesselData.arrivalDate || 'N/A'}</div>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Calendar className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-[var(--text-secondary)] text-xs mb-1">{t.departureDate}</div>
              <div className="text-[var(--text-primary)] font-bold text-sm">{vesselData.departureDate || 'N/A'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4">
             <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">{t.totalArrivals}</div>
                <div className="text-emerald-800 dark:text-emerald-300 font-bold text-2xl">{vesselData.totalArrivals || 1}</div>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <LogIn className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-blue-700 dark:text-blue-400 text-xs font-semibold mb-1 uppercase tracking-wider">{t.totalDepartures}</div>
                <div className="text-blue-800 dark:text-blue-300 font-bold text-2xl">{vesselData.totalDepartures || 0}</div>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <LogOut className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Timeline */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            {t.history}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <SortDesc className="w-4 h-4" />
            {isRTL ? 'الأحدث أولاً' : 'Newest First'}
          </div>
        </div>

        {sortedHistoryItems.length === 0 ? (
          <div className="text-center py-12 px-6 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--surface)]">
            <Info className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)] font-medium text-lg">{t.noHistory}</p>
          </div>
        ) : (
          <div className="relative border-l border-[var(--border-color)] ml-4 sm:ml-6 md:ml-8 space-y-10">
            {sortedHistoryItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="relative pl-8 sm:pl-10">
                {/* Timeline Dot */}
                <span className="absolute -left-4 top-1.5 flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm z-10">
                  {getEventIcon(item.type)}
                </span>
                
                {/* Content Card */}
                <div className="bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        {item.type}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          #{item.id}
                        </span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.timestamp}
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(item.status)}`}>
                      {getTranslatedStatus(item.status, language)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                    {item.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loadingMore ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
              {t.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
