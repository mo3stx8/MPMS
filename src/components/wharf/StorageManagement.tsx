import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Language } from '../../App';
import { Package, ThermometerSnowflake, FlaskConical, Box, AlertTriangle, Search, Calendar, RefreshCw, MapPin } from 'lucide-react';
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
  arrival_notification?: {
    id: number;
    name: string;
  };
}

export function StorageManagement({ language }: { language: Language }) {
  const isRTL = language === 'ar';
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chemical' | 'frozen' | 'dry'>('chemical');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reclassification Modal State
  const [reclassifyConfig, setReclassifyConfig] = useState<{
    isOpen: boolean;
    container: ContainerData | null;
    newType: 'chemical' | 'frozen' | 'dry';
    newKeyword: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    container: null,
    newType: 'chemical',
    newKeyword: '',
    isSubmitting: false
  });

  const fetchContainers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/wharf/containers');
      setContainers(res.data);
    } catch (err) {
      toast.error(isRTL ? 'فشل تحميل بيانات المخازن' : 'Failed to load storage data');
      console.error(err);
    } finally {

      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const filteredContainers = containers.filter(c => 
    c.status === 'discharged' &&
    c.storage_type === activeTab &&
    (c.description_of_goods.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.consignee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (c.arrival_notification?.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tabs = [
    { id: 'chemical', icon: FlaskConical, label: isRTL ? 'المنطقة الكيميائية' : 'Chemical Storage', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'frozen', icon: ThermometerSnowflake, label: isRTL ? 'منطقة التجميد' : 'Frozen Storage', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'dry', icon: Box, label: isRTL ? 'التخزين الجاف' : 'Dry Storage', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ] as const;

  const handleReclassifySubmit = async () => {
    if (!reclassifyConfig.container) return;
    try {
      setReclassifyConfig(prev => ({ ...prev, isSubmitting: true }));
      await api.post(`/wharf/containers/${reclassifyConfig.container.id}/reclassify`, {
        new_storage_type: reclassifyConfig.newType,
        new_keyword: reclassifyConfig.newKeyword
      });
      // Refresh the list after success
      await fetchContainers();
      toast.success(isRTL ? 'تمت إعادة تصنيف الحاوية بنجاح!' : 'Container reclassified successfully!');
      setReclassifyConfig(prev => ({ ...prev, isOpen: false, newKeyword: '' }));
    } catch (err) {
      toast.error(isRTL ? 'فشل إعادة تصنيف الحاوية' : 'Failed to reclassify container');
      console.error("Failed to reclassify container", err);
    } finally {

      setReclassifyConfig(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  if (isLoading && containers.length === 0) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] min-h-full">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحليل مصفوفة المخازن...' : 'Synchronizing storage engine...'} />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 bg-[var(--bg-primary)] min-h-full ${isRTL ? 'rtl rtl-text-right' : 'ltr'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-secondary/10 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {isRTL ? 'إدارة تصنيف المخازن' : 'Categorical Engine'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 max-w-2xl text-sm leading-relaxed">
            {isRTL 
              ? 'نظام توجيه آلي يقوم بفلترة وتوجيه أمان البضائع للمخازن الفنية بمجرد فك البيانات بالميناء.' 
              : 'Autonomously route incoming payloads into secure regional blocks matching their scanned payload parameters.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:flex-none">
              <input
                type="text"
                placeholder={isRTL ? "البحث بالبضاعة أو التاجر..." : "Search goods or trader..."}
                className="w-full md:w-72 pl-10 pr-5 py-2.5 bg-[var(--card)] border border-secondary/30 text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className={`w-4 h-4 text-[var(--text-secondary)] absolute top-3.5 ${isRTL ? 'right-4' : 'left-3.5'}`} />
            </div>
            <button onClick={fetchContainers} className="p-2.5 rounded-xl border border-secondary/30 text-[var(--text-secondary)] hover:bg-secondary/10 transition-colors">
               <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Tri Tab Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1.5 bg-secondary/5 rounded-2xl overflow-hidden border border-secondary/10">
        {tabs.map((tab) => {
          const count = containers.filter(c => c.status === 'discharged' && c.storage_type === tab.id).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between sm:justify-center gap-3 py-3.5 px-4 rounded-xl text-sm font-bold transition-all ${
                isActive 
                  ? `bg-[var(--card)] shadow-lg text-[var(--text-primary)] border border-secondary/10 ring-1 ring-inset ${tab.id==='chemical'?'ring-amber-500/20':tab.id==='frozen'?'ring-cyan-500/20':'ring-slate-500/20'}` 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--card)]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                 <tab.icon className={`w-5 h-5 ${isActive ? tab.color : 'opacity-40'}`} />
                 <span>{tab.label}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-widest ${isActive ? tab.bg + ' ' + tab.color : 'bg-secondary/10 text-[var(--text-secondary)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Categorical Results Table */}
      <div className="bg-[var(--card)] border border-secondary/20 rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={`px-6 py-5 border-b border-secondary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3
          ${activeTab === 'chemical' ? 'bg-amber-500/5' : ''}
          ${activeTab === 'frozen' ? 'bg-cyan-500/5' : ''}
          ${activeTab === 'dry' ? 'bg-slate-500/5' : ''}
        `}>
          <div className="flex gap-3 items-center">
              {activeTab === 'chemical' && <AlertTriangle className="w-5 h-5 text-amber-500 drop-shadow-sm" />}
              {activeTab === 'frozen' && <ThermometerSnowflake className="w-5 h-5 text-cyan-500 drop-shadow-sm" />}
              {activeTab === 'dry' && <Box className="w-5 h-5 text-slate-500 drop-shadow-sm" />}
              <h3 className="font-black text-[var(--text-primary)] uppercase tracking-widest text-xs">
                {tabs.find(t => t.id === activeTab)?.label} Queue
              </h3>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
            {filteredContainers.length} {isRTL ? 'وحدة' : 'Live Units'}
          </span>
        </div>

        {filteredContainers.length === 0 ? (
          <div className="py-24 text-center">
            <div className="bg-secondary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary/10">
               <Package className="w-10 h-10 text-secondary/30" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] mb-1">{isRTL ? 'المنطقة خالية' : 'Block Clear'}</h4>
            <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto leading-relaxed">{isRTL ? 'لا توجد حاويات تم تحليلها وتوجيهها للانتظار في هذه المنطقة حالياً.' : 'No payloads matching these categorical constraints are scheduled for storage handling.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary/5 text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-widest">
                <tr>
                  <th className={`px-6 py-4 border-b border-secondary/10 text-${isRTL ? 'right' : 'left'}`}>{isRTL ? 'السفينة المرتبطة' : 'Vessel Anchor'}</th>
                  <th className={`px-6 py-4 border-b border-secondary/10 text-${isRTL ? 'right' : 'left'}`}>{isRTL ? 'تحليل البضاعة' : 'Cargo Description'}</th>
                  <th className={`px-6 py-4 border-b border-secondary/10 text-${isRTL ? 'right' : 'left'}`}>{isRTL ? 'بيانات التاجر' : 'Verified Consignee'}</th>
                  <th className={`px-6 py-4 border-b border-secondary/10 text-${isRTL ? 'right' : 'left'}`}>{isRTL ? 'اللوجستيات' : 'Logistics'}</th>
                  <th className={`px-6 py-4 border-b border-secondary/10 text-center`}>{isRTL ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5 text-sm">
                {filteredContainers.map(container => (
                  <tr key={container.id} className="hover:bg-blue-500/[0.03] transition-colors group">
                    <td className="px-6 py-5 align-top">
                       <div className="flex flex-col">
                         <span className="font-black text-blue-500 uppercase tracking-tighter text-base">{container.arrival_notification?.name || 'Carrier Matrix'}</span>
                         <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">ID: {container.id.toString().padStart(6, '0')}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5 align-top max-w-[280px]">
                       <span className="text-[var(--text-primary)] font-semibold block leading-relaxed">{container.description_of_goods}</span>
                    </td>
                    <td className="px-6 py-5 align-top">
                       <span className="font-bold text-[var(--text-primary)] block bg-secondary/10 w-fit px-2.5 py-1 rounded-lg text-xs mb-1.5">{container.consignee_name}</span>
                       <span className="text-[10px] font-black text-[var(--text-secondary)] opacity-60 tracking-widest">{container.consignee_phone}</span>
                    </td>
                    <td className="px-6 py-5 align-top">
                       <div className="flex flex-col gap-1.5">
                           <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                             <Calendar className="w-3.5 h-3.5 text-indigo-500"/> {container.arrival_date}
                           </span>
                           <span className="text-[10px] font-black uppercase text-green-500 tracking-wider flex items-center gap-1.5">
                             <MapPin className="w-3 h-3" /> {container.port_of_loading}
                           </span>
                       </div>
                    </td>
                    <td className="px-6 py-5 align-middle text-center">
                       <button 
                         onClick={() => setReclassifyConfig({ 
                           isOpen: true, 
                           container, 
                           newType: container.storage_type, 
                           newKeyword: '', 
                           isSubmitting: false 
                         })}
                         className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                       >
                         {isRTL ? 'تخزين خاطئ؟' : 'Wrong Storage?'}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Status Briefing */}
      <div className="bg-[var(--card)] border border-secondary/10 rounded-2xl p-6 shadow-lg">
         <div className="flex items-center gap-3 mb-6">
           <div className="p-2.5 bg-indigo-500/10 rounded-xl">
             <AlertTriangle className="w-5 h-5 text-indigo-500" />
           </div>
           <h3 className="text-base font-bold text-[var(--text-primary)]">{isRTL ? 'نظام الحماية الآلي' : 'Safety Protocols'}</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: isRTL ? 'فلترة المخلفات' : 'Manifest Filtering', status: 'Operational', color: 'text-green-500' },
              { label: isRTL ? 'حماية البيانات' : 'Data encryption', status: 'Secure', color: 'text-blue-500' },
              { label: isRTL ? 'بروتوكول التخزين' : 'Categorical Logic', status: 'Enabled', color: 'text-indigo-500' },
              { label: isRTL ? 'تحديث المعلومات' : 'Live Sync', status: 'Heartbeat OK', color: 'text-green-500' }
            ].map((item, i) => (
              <div key={i} className="bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                 <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1 tracking-widest">{item.label}</p>
                 <p className={`text-sm font-black ${item.color}`}>{item.status}</p>
              </div>
            ))}
         </div>
      </div>

      {/* Reclassification Modal */}
      {reclassifyConfig.isOpen && reclassifyConfig.container && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-secondary/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary/10 flex justify-between items-center bg-red-500/5">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black tracking-tight">{isRTL ? 'الإبلاغ عن مسار خاطئ' : 'Report Routing Error'}</h3>
              </div>
              <button 
                onClick={() => setReclassifyConfig(prev => ({ ...prev, isOpen: false }))}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-black mb-1">{isRTL ? 'وصف البضاعة المحلل' : 'Extracted Description'}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{reclassifyConfig.container.description_of_goods || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2">
                  {isRTL ? 'الوجهة الصحيحة' : 'Correct Destination'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setReclassifyConfig(prev => ({ ...prev, newType: tab.id }))}
                      className={`py-2 px-3 flex flex-col items-center gap-1.5 rounded-lg border text-xs font-bold transition-all ${
                        reclassifyConfig.newType === tab.id 
                          ? `bg-[var(--card)] shadow-sm ${tab.color} ${tab.id==='chemical'?'border-amber-500/50':tab.id==='frozen'?'border-cyan-500/50':'border-slate-500/50'}` 
                          : 'border-secondary/20 text-[var(--text-secondary)] hover:bg-secondary/5'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2">
                  {isRTL ? 'إضافة كلمة مفتاحية جديدة' : 'Add Missing Keyword'}
                </label>
                <input 
                  type="text" 
                  value={reclassifyConfig.newKeyword}
                  onChange={(e) => setReclassifyConfig(prev => ({ ...prev, newKeyword: e.target.value }))}
                  placeholder={isRTL ? 'مثال: أكياس، مبردة...' : 'e.g. frozen, vaccine...'}
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-secondary/20 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-2 leading-relaxed opacity-80">
                  {isRTL 
                    ? 'سيتم إضافة هذه الكلمة لقاموس النظام لتوجيه الحاويات المشابهة مستقبلاً بشكل تلقائي.' 
                    : 'Adding a specific keyword from the description will train the engine to route similar manifests to this sector automatically.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-secondary/10 bg-secondary/5 flex justify-end gap-3">
              <button 
                onClick={() => setReclassifyConfig(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleReclassifySubmit}
                disabled={reclassifyConfig.isSubmitting}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white text-sm font-black rounded-lg transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                {reclassifyConfig.isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  isRTL ? 'تأكيد التعديل' : 'Confirm & Train'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
