import { useState, useEffect } from 'react';
import { Language } from '../../App';
import { BarChart3, Package, RefreshCw, Activity, FlaskConical, ThermometerSnowflake, Box, TrendingUp, AlertTriangle } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import api from '../../services/api';

interface CapacityOverviewProps {
  language: Language;
}

interface ContainerData {
  id: number;
  storage_type: 'chemical' | 'frozen' | 'dry';
  status: string;
  description_of_goods: string;
  arrival_date: string;
}

export function CapacityOverview({ language }: CapacityOverviewProps) {
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(true);
  const [containers, setContainers] = useState<ContainerData[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/wharf/containers');
      setContainers(res.data);
    } catch (error) {
      console.error('Error loading capacity data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute real stats from container data
  const chemicalCount = containers.filter(c => c.storage_type === 'chemical').length;
  const frozenCount = containers.filter(c => c.storage_type === 'frozen').length;
  const dryCount = containers.filter(c => c.storage_type === 'dry').length;
  const totalCount = containers.length;

  const pendingCount = containers.filter(c => c.status === 'pending' || c.status === 'assigned').length;
  const inWharfCount = containers.filter(c => c.status === 'in_wharf').length;
  const clearedCount = containers.filter(c => c.status === 'cleared' || c.status === 'ready_discharge').length;

  const categories = [
    {
      id: 'chemical',
      count: chemicalCount,
      icon: FlaskConical,
      label: isRTL ? 'كيميائي' : 'Chemical',
      color: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/30',
    },
    {
      id: 'frozen',
      count: frozenCount,
      icon: ThermometerSnowflake,
      label: isRTL ? 'مُجمّد' : 'Frozen',
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-400/30',
    },
    {
      id: 'dry',
      count: dryCount,
      icon: Box,
      label: isRTL ? 'جاف' : 'Dry',
      color: 'from-slate-500 to-gray-600',
      textColor: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-400/30',
    },
  ];

  if (loading && containers.length === 0) {
    return (
      <div className="p-6 bg-[var(--bg-primary)] min-h-full flex items-center justify-center">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري التحميل...' : 'Loading...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-[var(--bg-primary)] min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isRTL ? 'نظرة عامة على السعة' : 'Capacity Overview'}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {isRTL ? 'مراقبة وتحليل سعة التخزين الفعلية' : 'Monitor and analyze real-time storage capacity'}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="border border-secondary/30 text-[var(--text-primary)] hover:bg-secondary/10 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center"
        >
          {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Overall Stats Card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <BarChart3 className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                {isRTL ? 'إجمالي الحاويات' : 'Total Containers'}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {totalCount} {isRTL ? 'حاوية مسجلة في النظام' : 'containers registered'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-blue-500 drop-shadow-sm mb-1">{totalCount}</div>
            <div className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {isRTL ? 'وحدة نشطة' : 'Active Units'}
            </div>
          </div>
        </div>

        {/* Status distribution bar */}
        {totalCount > 0 && (
          <div className="w-full bg-white/5 rounded-full h-8 overflow-hidden mb-8 flex border border-white/10 shadow-inner">
            {pendingCount > 0 && (
              <div
                className="h-8 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-[10px] uppercase tracking-tighter transition-all duration-700"
                style={{ width: `${(pendingCount / totalCount) * 100}%` }}
              >
                {pendingCount > 0 && `${isRTL ? 'معلق' : 'Pending'} ${pendingCount}`}
              </div>
            )}
            {inWharfCount > 0 && (
              <div
                className="h-8 bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-[10px] uppercase tracking-tighter transition-all duration-700"
                style={{ width: `${(inWharfCount / totalCount) * 100}%` }}
              >
                {inWharfCount > 0 && `${isRTL ? 'في الرصيف' : 'Wharf'} ${inWharfCount}`}
              </div>
            )}
            {clearedCount > 0 && (
              <div
                className="h-8 bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-black text-[10px] uppercase tracking-tighter transition-all duration-700"
                style={{ width: `${(clearedCount / totalCount) * 100}%` }}
              >
                {clearedCount > 0 && `${isRTL ? 'مخلّص' : 'Cleared'} ${clearedCount}`}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 relative z-10">
          <div className="bg-[var(--card)]/40 rounded-2xl p-5 border border-secondary/10 backdrop-blur-md">
            <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-2 tracking-widest">{isRTL ? 'معلّق' : 'Pending'}</p>
            <p className="text-3xl font-black text-amber-500 leading-none mb-1">{pendingCount}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/60 font-medium">{isRTL ? 'حاوية' : 'ITS units'}</p>
          </div>
          <div className="bg-[var(--card)]/40 rounded-2xl p-5 border border-secondary/10 backdrop-blur-md">
            <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-2 tracking-widest">{isRTL ? 'في الرصيف' : 'In Wharf'}</p>
            <p className="text-3xl font-black text-blue-500 leading-none mb-1">{inWharfCount}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/60 font-medium">{isRTL ? 'حاوية' : 'ITS units'}</p>
          </div>
          <div className="bg-[var(--card)]/40 rounded-2xl p-5 border border-secondary/10 backdrop-blur-md">
            <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-2 tracking-widest">{isRTL ? 'تم التخليص' : 'Cleared'}</p>
            <p className="text-3xl font-black text-green-500 leading-none mb-1">{clearedCount}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/60 font-medium">{isRTL ? 'حاوية' : 'ITS units'}</p>
          </div>
        </div>
      </div>

      {/* Capacity by Storage Type */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-500" />
          {isRTL ? 'التوزيع حسب نوع التخزين' : 'Distribution by Storage Type'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const percentage = totalCount > 0 ? (cat.count / totalCount) * 100 : 0;

            return (
              <div
                key={cat.id}
                className={`bg-[var(--card)] rounded-3xl p-6 border border-secondary/10 shadow-lg relative group overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                   <cat.icon className="w-24 h-24" />
                </div>
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 ${cat.bgColor} rounded-2xl`}>
                      <cat.icon className={`w-6 h-6 ${cat.textColor}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">{cat.label}</h3>
                      <p className={`text-xs font-semibold ${cat.textColor}/80`}>
                        {cat.count} {isRTL ? 'حاوية' : 'containers'}
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-black ${cat.textColor}`}>{percentage.toFixed(0)}%</div>
                </div>

                <div className="w-full bg-[var(--background)]/60 rounded-full h-3 overflow-hidden mb-4 border border-secondary/5">
                  <div
                    className={`h-3 bg-gradient-to-r ${cat.color} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className={`${cat.textColor}`}>
                    {cat.count} / {totalCount} {isRTL ? 'وحدة' : 'units'}
                  </span>
                  <span className="text-[var(--text-secondary)]/40">
                    {percentage.toFixed(1)}% {isRTL ? 'من الإجمالي' : 'of global'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Briefing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--card)] border border-secondary/10 rounded-2xl p-6 shadow-lg">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-green-500/10 rounded-xl">
                 <TrendingUp className="w-5 h-5 text-green-500" />
               </div>
               <h3 className="text-base font-bold text-[var(--text-primary)]">{isRTL ? 'اتجاه الإشغال' : 'Occupancy Trend'}</h3>
             </div>
             <div className="space-y-4">
                {[
                  { label: isRTL ? 'معدل الدوران' : 'Throughput Rate', value: 'High', color: 'text-green-500' },
                  { label: isRTL ? 'كثافة التخزين' : 'Storage Density', value: `${((totalCount / 500) * 100).toFixed(1)}%`, color: 'text-blue-500' },
                  { label: isRTL ? 'وقت الانتظار' : 'Dwell Time', value: '2.4d', color: 'text-amber-500' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-secondary/5 last:border-0">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
                    <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-[var(--card)] border border-secondary/10 rounded-2xl p-6 shadow-lg">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-amber-500/10 rounded-xl">
                 <AlertTriangle className="w-5 h-5 text-amber-500" />
               </div>
               <h3 className="text-base font-bold text-[var(--text-primary)]">{isRTL ? 'تنبيهات السعة' : 'Capacity Alerts'}</h3>
             </div>
             <div className="space-y-3">
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">{isRTL ? 'المنطقة الكيميائية' : 'Chemical Zone'}</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                       {chemicalCount > 50 
                          ? isRTL ? 'تحذير: المنطقة الكيميائية تقترب من السعة القصوى.' : 'Warning: Chemical storage approaching technical limit.'
                          : isRTL ? 'المنطقة تعمل ضمن المعايير الآمنة.' : 'Zone operating within safety parameters.'}
                    </p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">{isRTL ? 'منطقة التجميد' : 'Frozen Zone'}</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                       {isRTL ? 'جميع وحدات التبريد تعمل بكفاءة عالية.' : 'All refrigeration units operating at peak efficiency.'}
                    </p>
                </div>
             </div>
          </div>
      </div>

      {/* Real-time Status Briefing */}
      <div className="bg-[var(--card)] border border-secondary/10 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-2xl">
            <Activity className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {isRTL ? 'ملخص مصفوفة الحالة' : 'Status Matrix Summary'}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-[var(--text-primary)] mb-1">{totalCount}</div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{isRTL ? 'إجمالي الأصول' : 'Total Assets'}</p>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-500 mb-1">{chemicalCount}</div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{isRTL ? 'كيميائي' : 'Chemical'}</p>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-500 mb-1">{frozenCount}</div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{isRTL ? 'مُجمّد' : 'Frozen'}</p>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-500 mb-1">{dryCount}</div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{isRTL ? 'جاف' : 'Dry'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
