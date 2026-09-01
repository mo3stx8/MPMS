import React, { useState, useEffect } from 'react';
import { Package, MapPin, Calendar, CheckSquare, Clock, FileText, Ship, Search, Filter, RefreshCw, Link, X, Anchor } from 'lucide-react';
import { Language } from '../../App';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import api from '../../services/api';

interface ContainerData {
  id: number;
  vessel_id: number;
  manifest_file_path: string;
  port_of_loading: string;
  arrival_date: string;
  description_of_goods: string;
  storage_type: 'chemical' | 'frozen' | 'dry';
  consignee_name: string;
  consignee_phone: string;
  status: string;
}

interface VesselData {
  id: number;
  name: string;
  status: string;
  eta: string;
  wharf?: {
    name: string;
  };
  containers: ContainerData[];
}

export function MyContainers({ language, userEmail }: { language: Language; userEmail: string }) {
  const isRTL = language === 'ar';
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVessel, setSelectedVessel] = useState<VesselData | null>(null);

  const fetchVessels = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trader/my-containers');
      setVessels(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  const getContainerStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'discharged':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {isRTL ? 'تم التفريغ' : 'Discharged'}
          </span>
        );
      case 'in storage':
      case 'in_storage':
      case 'in_wharf':
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {isRTL ? 'في التخزين' : 'In Storage'}
          </span>
        );
      case 'cleared':
      case 'ready_discharge':
      case 'ready-discharge':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
             {isRTL ? 'جاهزة للاستلام' : 'Ready for Pickup'}
          </span>
        );
      case 'arrived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {isRTL ? 'وصلت' : 'Arrived'}
          </span>
        );
      case 'rejected_by_executive':
      case 'rejected':
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {isRTL ? 'مرفوض' : 'Rejected'}
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {isRTL ? 'قيد المراجعة' : 'Pending'}
          </span>
        );
    }
  };

  const getVesselStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('docked') || s.includes('wharf')) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <Anchor className="w-3.5 h-3.5" /> {isRTL ? 'رست' : 'Docked'}
          </span>
        );
    }
    if (s === 'departed' || s === 'cleared') {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <Ship className="w-3.5 h-3.5" /> {isRTL ? 'غادرت' : 'Departed'}
          </span>
        );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
        <Ship className="w-3.5 h-3.5" /> {isRTL ? 'في الانتظار' : 'Anchored/Pending'}
      </span>
    );
  };

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = vessel.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalContainers = vessels.reduce((acc, vessel) => acc + (vessel.containers?.length || 0), 0);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] min-h-full">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحميل السفن...' : 'Retrieving secure vessels...'} />
      </div>
    );
  }

  return (
    <div className={`p-6 bg-[var(--bg-primary)] min-h-full space-y-6 ${isRTL ? 'rtl rtl-text-right' : 'ltr'}`}>
      {/* Immersive Header Block */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 lg:p-10 text-white shadow-xl relative overflow-hidden">
        {/* Background Decorative Graphic */}
        <Ship className={`absolute -bottom-16 opacity-10 w-80 h-80 ${isRTL ? '-left-16 rotate-12' : '-right-16 -rotate-12'} pointer-events-none`} />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                    <Link className="w-3 h-3" /> {isRTL ? 'إتصال آمن' : 'Encrypted Registry Link'}
                  </span>
                  <button onClick={fetchVessels} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight drop-shadow-md">
                   {isRTL ? 'البضائع و الحاويات المسجلة' : 'My Monitored Payloads'}
                </h2>
                <p className="text-blue-50 text-sm lg:text-base max-w-xl font-medium opacity-90">
                   {isRTL 
                       ? 'يتم عرض الحاويات الخاصة بك مجمعة حسب السفن الناقلة لتسهيل متابعة الشحنات وتفريغها.' 
                       : 'Your containers are grouped by carrying vessels for easier tracking and discharge management.'}
                </p>
            </div>

            <div className="mt-6 md:mt-0 flex gap-4">
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-inner flex flex-col items-center min-w-[100px]">
                  <span className="text-4xl font-black drop-shadow-md">{vessels.length}</span>
                  <span className="text-xs mt-1 font-bold tracking-wider uppercase opacity-90">{isRTL ? 'السفن' : 'Vessels'}</span>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-inner flex flex-col items-center min-w-[100px]">
                  <span className="text-4xl font-black drop-shadow-md">{totalContainers}</span>
                  <span className="text-xs mt-1 font-bold tracking-wider uppercase opacity-90">{isRTL ? 'الحاويات' : 'Containers'}</span>
              </div>
            </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]`} />
          <input
            type="text"
            placeholder={isRTL ? 'ابحث عن اسم السفينة...' : 'Search by vessel name...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10'} py-2.5 bg-[var(--card)] border border-secondary/30 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
          />
        </div>
      </div>

      {filteredVessels.length === 0 ? (
        <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl p-16 text-center shadow-sm">
          <div className="bg-secondary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary/20">
             <Ship className="w-8 h-8 text-[var(--text-secondary)] opacity-40" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
             {isRTL ? 'لا توجد سفن مسجلة' : 'No Vessels Found'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto leading-relaxed">
             {isRTL 
               ? 'لم يتم العثور على أي سفن تطابق بحثك أو تحتوي على حاويات خاصة بك.' 
               : 'No vessels matching your search or containing your containers were found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {filteredVessels.map((vessel, idx) => (
            <div key={vessel.id} 
              onClick={() => setSelectedVessel(vessel)}
              className="bg-[var(--card)] border border-secondary/20 hover:border-blue-500/50 hover:shadow-md transition-all rounded-2xl p-6 shadow-sm group flex flex-col h-full cursor-pointer"
              style={{animationDelay: `${idx * 100}ms`}}
            >
              <div className="flex justify-between items-start mb-4 border-b border-secondary/10 pb-4">
                <div>
                   <h3 className="font-extrabold text-xl text-[var(--text-primary)] flex items-center gap-2">
                      <Ship className="w-5 h-5 text-blue-500" />
                      {vessel.name}
                   </h3>
                </div>
                {getVesselStatusBadge(vessel.status)}
              </div>

              <div className="space-y-4 flex-grow">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-full border border-blue-500/20">
                         <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">{isRTL ? 'تاريخ الوصول' : 'ETA / Arrival'}</span>
                          <span className="text-sm font-black text-[var(--text-primary)]">{vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'TBD'}</span>
                      </div>
                  </div>

                  <div className="flex items-center gap-3">
                      <div className="bg-amber-500/10 p-2 rounded-full border border-amber-500/20">
                         <MapPin className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">{isRTL ? 'الرصيف' : 'Wharf'}</span>
                          <span className="text-sm font-black text-[var(--text-primary)]">
                            {vessel.wharf?.name || (isRTL ? 'قيد التخصيص' : 'TBD')}
                          </span>
                      </div>
                  </div>
                </div>

                <div className="mt-4 bg-[var(--bg-primary)]/50 rounded-xl p-4 flex items-center justify-between border border-secondary/10">
                   <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/10 p-2 rounded-lg">
                        <Package className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{isRTL ? 'إجمالي الحاويات' : 'Your Containers'}</span>
                        <span className="block text-xl font-black text-[var(--text-primary)]">{vessel.containers?.length || 0}</span>
                      </div>
                   </div>
                   <div className="text-blue-500 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
                      {isRTL ? 'عرض ←' : 'View →'}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Vessel Containers */}
      {selectedVessel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-secondary/20 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-secondary/20 flex justify-between items-center bg-[var(--bg-primary)]">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Ship className="w-6 h-6 text-blue-500" />
                  {selectedVessel.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
                  {isRTL ? `يوجد ${selectedVessel.containers?.length || 0} حاويات لك على هذه السفينة` : `You have ${selectedVessel.containers?.length || 0} containers on this vessel`}
                </p>
              </div>
              <button 
                onClick={() => setSelectedVessel(null)}
                className="p-2 bg-secondary/10 hover:bg-secondary/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow bg-[var(--card)] space-y-8">
               {/* Container Groups */}
               {(['dry', 'frozen', 'chemical'] as const).map(type => {
                 const typeContainers = selectedVessel.containers?.filter(c => c.storage_type?.toLowerCase() === type) || [];
                 if (typeContainers.length === 0) return null;

                 return (
                   <div key={type} className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-secondary/10 pb-2">
                        <Package className={`w-5 h-5 ${type === 'chemical' ? 'text-amber-500' : type === 'frozen' ? 'text-cyan-500' : 'text-slate-500'}`} />
                        <h4 className="font-bold text-lg text-[var(--text-primary)] uppercase tracking-wide">
                          {type === 'chemical' ? (isRTL ? 'حاويات كيميائية' : 'Chemical Containers') :
                           type === 'frozen' ? (isRTL ? 'حاويات مجمدة' : 'Frozen Containers') :
                           (isRTL ? 'حاويات جافة' : 'Dry Containers')}
                        </h4>
                        <span className="px-2 py-0.5 bg-secondary/10 rounded-full text-xs font-bold text-[var(--text-secondary)]">
                          {typeContainers.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {typeContainers.map(container => (
                          <div key={container.id} className="p-4 rounded-xl border border-secondary/20 bg-[var(--bg-primary)]/50 hover:border-blue-500/30 transition-colors">
                             <div className="flex justify-between items-start mb-3">
                                <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-secondary/10 px-2 py-1 rounded">
                                  ID: {container.id.toString().padStart(6, '0')}
                                </span>
                                {getContainerStatusBadge(container.status)}
                             </div>
                             <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                               {container.description_of_goods}
                             </p>
                             <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                               <MapPin className="w-3.5 h-3.5" />
                               {container.port_of_loading}
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 );
               })}
               
               {/* Unknown Storage Type fallback */}
               {(() => {
                 const unknownContainers = selectedVessel.containers?.filter(c => !['dry', 'frozen', 'chemical'].includes(c.storage_type?.toLowerCase())) || [];
                 if (unknownContainers.length === 0) return null;
                 
                 return (
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-secondary/10 pb-2">
                        <Package className="w-5 h-5 text-gray-500" />
                        <h4 className="font-bold text-lg text-[var(--text-primary)] uppercase tracking-wide">
                          {isRTL ? 'غير محدد' : 'Unspecified Storage'}
                        </h4>
                        <span className="px-2 py-0.5 bg-secondary/10 rounded-full text-xs font-bold text-[var(--text-secondary)]">
                          {unknownContainers.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unknownContainers.map(container => (
                          <div key={container.id} className="p-4 rounded-xl border border-secondary/20 bg-[var(--bg-primary)]/50 hover:border-blue-500/30 transition-colors">
                             <div className="flex justify-between items-start mb-3">
                                <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-secondary/10 px-2 py-1 rounded">
                                  ID: {container.id.toString().padStart(6, '0')}
                                </span>
                                {getContainerStatusBadge(container.status)}
                             </div>
                             <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                               {container.description_of_goods}
                             </p>
                             <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                               <MapPin className="w-3.5 h-3.5" />
                               {container.port_of_loading}
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )
               })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
