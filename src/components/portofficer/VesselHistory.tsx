import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ArrowLeft, Anchor, FileText, Ship, Info, Calendar, Clock, CheckCircle2, XCircle, Search, Navigation, Package, Hash, LogIn, LogOut, ChevronDown, SortDesc, Radio } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { echo } from '../../utils/echo';
import api from '../../services/api';

interface VesselHistoryProps {
  language: Language;
  vesselId: string | number;
  onNavigate: (page: string, params?: { vesselId?: number | string }) => void;
}

interface VesselRecord {
  id: number; name: string; imo_number: string; type: string; flag: string; status: string;
}

export function VesselHistory({ language, vesselId, onNavigate }: VesselHistoryProps) {
  const isRTL = language === 'ar';
  const t = {
    title: isRTL ? 'سجل السفن' : 'Vessel History',
    subtitle: isRTL ? 'السجل التاريخي الشامل للعمليات' : 'Comprehensive operational timeline',
    back: isRTL ? 'العودة' : 'Back',
    history: isRTL ? 'الجدول الزمني' : 'Historical Timeline',
    loadMore: isRTL ? 'تحميل المزيد' : 'Load More',
    noHistory: isRTL ? 'لا يوجد سجل تاريخي' : 'No historical records found.',
    searchPlaceholder: isRTL ? 'بحث برقم IMO' : 'Search by IMO Number',
    search: isRTL ? 'بحث' : 'Search',
    liveLabel: isRTL ? 'مباشر' : 'LIVE',
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vesselData, setVesselData] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeVesselId, setActiveVesselId] = useState<string | number>(vesselId);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSelector, setShowSelector] = useState(!vesselId);
  const [vesselList, setVesselList] = useState<VesselRecord[]>([]);
  const [vesselSearchText, setVesselSearchText] = useState('');
  const [loadingVessels, setLoadingVessels] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  const PREFIX = '/officer';

  const sortedHistoryItems = useMemo(() =>
    [...historyItems].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [historyItems]
  );

  const fetchVesselList = useCallback(async (search?: string) => {
    setLoadingVessels(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`${PREFIX}/vessels-list${params}`);
      setVesselList(res.data.data || []);
    } catch { setVesselList([]); }
    finally { setLoadingVessels(false); }
  }, []);

  useEffect(() => { if (!vesselId) fetchVesselList(); }, [vesselId, fetchVesselList]);

  useEffect(() => {
    if (!showSelector) return;
    const timeout = setTimeout(() => fetchVesselList(vesselSearchText || undefined), 300);
    return () => clearTimeout(timeout);
  }, [vesselSearchText, showSelector]);

  const fetchHistory = async (targetPage: number, vid: string | number) => {
    try {
      const res = await api.get(`${PREFIX}/vessels/${vid}/history?page=${targetPage}`);
      if (targetPage === 1) { setVesselData(res.data.vessel); setHistoryItems(res.data.history.data); }
      else { setHistoryItems(prev => [...prev, ...res.data.history.data]); }
      setHasMore(res.data.history.current_page < res.data.history.last_page);
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Vessel not found' : 'Failed to load');
    }
  };

  useEffect(() => { setActiveVesselId(vesselId); }, [vesselId]);

  useEffect(() => {
    if (!activeVesselId) { setShowSelector(true); return; }
    setLoading(true); setError(null); setShowSelector(false);
    fetchHistory(1, activeVesselId).finally(() => setLoading(false));
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

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); if (searchQuery.trim()) setActiveVesselId(searchQuery.trim()); };
  const handleSelectVessel = (v: VesselRecord) => { setActiveVesselId(v.id); setShowSelector(false); };
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    await fetchHistory(next, activeVesselId);
    setPage(next);
    setLoadingMore(false);
  };

  const getEventIcon = (type: string) => {
    if (type.includes('Arrival')) return <Ship className="w-4 h-4 text-blue-700 dark:text-blue-400" />;
    if (type.includes('Cargo')) return <FileText className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />;
    if (type.includes('Wharf') || type.includes('Berth')) return <Anchor className="w-4 h-4 text-amber-700 dark:text-amber-400" />;
    if (type.includes('Clearance')) return <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
    if (type.includes('Depart')) return <Navigation className="w-4 h-4 text-purple-700 dark:text-purple-400" />;
    return <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'approved': return 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-900/30';
      case 'pending': return 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-900/30';
      case 'rejected': case 'failed': return 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-900/30';
      default: return 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-900/30';
    }
  };

  const getVesselStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'awaiting': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // ─── Vessel Selector ────────────────────────────────────────────────
  if (showSelector && !loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 p-6">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('dashboard')} className="p-3 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all group">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">{t.title}</h1>
            <p className="text-slate-500 dark:text-slate-400">{isRTL ? 'اختر سفينة لعرض سجلها' : 'Select a vessel to view its history'}</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <Ship className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{isRTL ? 'اختر سفينة' : 'Select a Vessel'}</h3>
          </div>
          <div className="relative mb-6">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]`} />
            <input type="text" value={vesselSearchText} onChange={(e) => setVesselSearchText(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم أو IMO...' : 'Search by name or IMO...'}
              className={`w-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-3.5 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-primary transition-colors`} />
          </div>
          {loadingVessels ? (
            <div className="flex flex-col items-center py-16"><RefreshCw className="w-10 h-10 text-blue-500 animate-spin" /></div>
          ) : vesselList.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--surface)]">
              <Ship className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">{isRTL ? 'لا توجد سفن' : 'No vessels found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {vesselList.map((v) => (
                <button key={v.id} onClick={() => handleSelectVessel(v)}
                  className="text-left p-5 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] hover:border-primary rounded-xl transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2"><Ship className="w-5 h-5 text-primary" /><span className="text-[var(--text-primary)] font-bold truncate max-w-[140px]">{v.name}</span></div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${getVesselStatusColor(v.status)}`}>{v.status}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Hash className="w-3.5 h-3.5" /><span>IMO: {v.imo_number || 'N/A'}</span></div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Info className="w-3.5 h-3.5" /><span>{v.type} • {v.flag || '🏳️'}</span></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 min-h-full flex items-center justify-center"><LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري التحميل...' : 'Loading vessel profile...'} /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <XCircle className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-bold text-white">{error}</h2>
      <div className="flex gap-3">
        <button onClick={() => { setError(null); setShowSelector(true); setActiveVesselId(''); }} className="px-6 py-3 bg-primary/10 border border-primary/30 rounded-xl text-primary font-bold">{isRTL ? 'اختر سفينة أخرى' : 'Select Another'}</button>
        <button onClick={() => onNavigate('dashboard')} className="px-6 py-3 bg-[var(--surface)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)]">{t.back}</button>
      </div>
    </div>
  );

  // ─── Main History View ──────────────────────────────────────────────
  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => { setShowSelector(true); setActiveVesselId(''); setVesselData(null); setHistoryItems([]); }}
            className="p-3 bg-[var(--surface)] hover:bg-secondary/10 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-all">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 text-xs font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5" /> {t.liveLabel}
            </span>
          )}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder}
                className={`w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg py-2.5 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm shadow-sm`} />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">{t.search}</button>
          </form>
        </div>
      </div>

      {/* Master Record */}
      {vesselData && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 dark:bg-blue-500" />
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-center justify-center"><Ship className="w-7 h-7" /></div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{vesselData.vesselName || vesselData.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-1"><Info className="w-4 h-4" /> IMO: {vesselData.imo}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{isRTL ? 'العلم' : 'Flag'}</div>
              <div className="text-slate-900 dark:text-slate-50 font-bold">{vesselData.flag}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{isRTL ? 'النوع' : 'Type'}</div>
              <div className="text-slate-900 dark:text-slate-50 font-bold">{vesselData.type}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3">
              <div className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">{isRTL ? 'الوصول' : 'Arrivals'}</div>
              <div className="text-emerald-800 dark:text-emerald-300 font-bold text-xl">{vesselData.totalArrivals || 1}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
              <div className="text-blue-700 dark:text-blue-400 text-xs font-semibold mb-1">{isRTL ? 'التصاريح' : 'Clearances'}</div>
              <div className="text-blue-800 dark:text-blue-300 font-bold text-xl">{vesselData.totalDepartures || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" /> {t.history}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><SortDesc className="w-4 h-4" />{isRTL ? 'الأحدث أولاً' : 'Newest First'}</div>
        </div>
        {sortedHistoryItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--surface)]">
            <Info className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)] font-medium text-lg">{t.noHistory}</p>
          </div>
        ) : (
          <div className="relative border-l border-[var(--border-color)] ml-4 sm:ml-6 md:ml-8 space-y-10">
            {sortedHistoryItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="relative pl-8 sm:pl-10">
                <span className="absolute -left-4 top-1.5 flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm z-10">
                  {getEventIcon(item.type)}
                </span>
                <div className="bg-slate-50 dark:bg-slate-700/25 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        {item.type}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">#{item.id}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1"><Calendar className="w-3.5 h-3.5" />{item.timestamp}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">{item.details}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <button onClick={handleLoadMore} disabled={loadingMore}
              className="px-6 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 rounded-lg font-medium text-sm inline-flex items-center gap-2">
              {loadingMore ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />} {t.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
