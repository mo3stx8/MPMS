import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { Language } from '../../App';
import { Ship, Eye, FileCheck, Clock, Anchor, Search, XCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { getVessels, releaseBerth, Vessel } from '../../utils/portOfficerApi';

interface ActiveVesselsProps {
  language: Language;
  onNavigate: (page: string) => void;
}

export function ActiveVessels({ language, onNavigate }: ActiveVesselsProps) {
  const isRTL = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [vesselToRelease, setVesselToRelease] = useState<Vessel | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const vesselsData = await getVessels();
      setVessels(vesselsData);
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل بيانات السفن' : 'Failed to load vessels data');
      console.error('Error loading vessels:', error);
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleReleaseBerth = async () => {
    if (!vesselToRelease || !vesselToRelease.currentWharf || releasing) return;
    setReleasing(true);
    try {
      await releaseBerth(vesselToRelease.id, vesselToRelease.currentWharf, 'Port Officer');
      toast.success(isRTL ? 'تم تحرير الرصيف بنجاح!' : 'Berth released successfully!');
      await loadData();
      setShowReleaseModal(false);
      setVesselToRelease(null);
    } catch (error: any) {
      console.error('Error releasing berth:', error);
      toast.error(error.message || (isRTL ? 'فشل تحرير الرصيف' : 'Failed to release berth'));
    } finally {

      setReleasing(false);
    }
  };

  const activeVessels = vessels.filter(v => v.status !== 'awaiting');
  const filteredVessels = activeVessels.filter(vessel =>
    vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vessel.currentWharf && vessel.currentWharf.toLowerCase().includes(searchTerm.toLowerCase())) ||
    vessel.agent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'docked': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'loading': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'unloading': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      case 'ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getClearanceBadge = (status: string) => {
    switch (status) {
      case 'issued': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    if (isRTL) {
      const map: Record<string, string> = { docked: 'راسية', loading: 'تحميل', unloading: 'تفريغ', ready: 'جاهزة' };
      return map[status] || status;
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getClearanceLabel = (status: string) => {
    if (isRTL) {
      const map: Record<string, string> = { issued: 'صادر', pending: 'معلق', none: 'لا يوجد' };
      return map[status] || status;
    }
    const map: Record<string, string> = { issued: 'Issued', pending: 'Pending', none: 'None' };
    return map[status] || status;
  };

  const viewDetails = (vessel: Vessel) => { setSelectedVessel(vessel); setShowDetailsModal(true); };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
        <LoadingIndicator type="line-spinner" size="lg" label={isRTL ? 'جاري تحميل البيانات...' : 'Loading data...'} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{isRTL ? 'السفن النشطة' : 'Active Vessels'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRTL ? 'السفن الراسية حالياً في الميناء' : 'Vessels Currently Docked in Port'}</p>
        </div>
        <button onClick={loadData} disabled={loading} className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
          {loading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: activeVessels.length, label: isRTL ? 'إجمالي السفن' : 'Total Vessels', color: 'text-slate-900 dark:text-slate-50' },
          { value: activeVessels.filter(v => v.status === 'ready').length, label: isRTL ? 'جاهز للمغادرة' : 'Ready to Depart', color: 'text-green-700 dark:text-green-400' },
          { value: activeVessels.filter(v => v.clearanceStatus === 'pending').length, label: isRTL ? 'تصاريح معلقة' : 'Pending Clearances', color: 'text-amber-700 dark:text-amber-400' },
          { value: activeVessels.filter(v => v.clearanceStatus === 'issued').length, label: isRTL ? 'تصاريح صادرة' : 'Clearances Issued', color: 'text-blue-700 dark:text-blue-400' },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
            <div className={`text-2xl font-bold mb-1 ${item.color}`}>{item.value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، الرصيف، أو الوكيل...' : 'Search by name, wharf, or agent...'}
            className={`w-full ${isRTL ? 'pr-10' : 'pl-10'} py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors`}
          />
        </div>
      </div>

      {/* Vessels Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/25 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {[isRTL ? 'اسم السفينة' : 'Vessel Name', isRTL ? 'النوع' : 'Type', isRTL ? 'الرصيف' : 'Wharf', isRTL ? 'وقت الوصول' : 'Arrival Time', isRTL ? 'الحالة' : 'Status', isRTL ? 'التصريح' : 'Clearance', isRTL ? 'الإجراءات' : 'Actions'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredVessels.map((vessel) => (
                <tr key={vessel.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Ship className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-slate-50 font-medium text-sm">{vessel.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{vessel.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300 text-sm">{vessel.type}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Anchor className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-900 dark:text-slate-50 font-medium text-sm">{vessel.currentWharf || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
                      <Clock className="w-3.5 h-3.5" />{vessel.arrival}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(vessel.status)}`}>{getStatusLabel(vessel.status)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getClearanceBadge(vessel.clearanceStatus)}`}>{getClearanceLabel(vessel.clearanceStatus)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => viewDetails(vessel)} className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors" title={isRTL ? 'عرض التفاصيل' : 'View Details'}>
                        <Eye className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      </button>
                      {vessel.clearanceStatus !== 'issued' && (
                      <button onClick={() => onNavigate('clearances')} className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors" title={isRTL ? 'عرض التصاريح' : 'View Clearances'}>
                        <FileCheck className="w-4 h-4 text-green-700 dark:text-green-400" />
                      </button>
                      )}
                      <button onClick={() => { setVesselToRelease(vessel); setShowReleaseModal(true); }} className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors" title={isRTL ? 'تحرير الرصيف' : 'Release Berth'}>
                        <XCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredVessels.length === 0 && (
          <div className="text-center py-12">
            <Ship className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">{isRTL ? 'لا توجد سفن متطابقة مع البحث' : 'No vessels match your search'}</p>
          </div>
        )}
      </div>

      {/* Vessel Details Modal */}
      {showDetailsModal && selectedVessel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Ship className="w-5 h-5 text-blue-700 dark:text-blue-400" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedVessel.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedVessel.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: isRTL ? 'نوع السفينة' : 'Vessel Type', value: selectedVessel.type },
                { label: isRTL ? 'الرصيف' : 'Wharf', value: selectedVessel.currentWharf || 'N/A' },
                { label: isRTL ? 'وقت الوصول' : 'Arrival Time', value: selectedVessel.arrival },
                { label: isRTL ? 'الوكيل البحري' : 'Maritime Agent', value: selectedVessel.agent },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                  <p className="text-slate-900 dark:text-slate-50 font-medium text-sm">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{isRTL ? 'حالة السفينة' : 'Vessel Status'}</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedVessel.status)}`}>{getStatusLabel(selectedVessel.status)}</span>
              </div>
              <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-700/25 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{isRTL ? 'حالة التصريح' : 'Clearance Status'}</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getClearanceBadge(selectedVessel.clearanceStatus)}`}>{getClearanceLabel(selectedVessel.clearanceStatus)}</span>
              </div>
            </div>

            {selectedVessel.clearanceStatus !== 'issued' && (
              <button onClick={() => { setShowDetailsModal(false); onNavigate('clearances'); }} className="w-full bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <FileCheck className="w-4 h-4" />{isRTL ? 'عرض حالة تصريح المغادرة' : 'View Departure Clearance Status'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Release Berth Modal */}
      {showReleaseModal && vesselToRelease && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><XCircle className="w-5 h-5 text-red-700 dark:text-red-400" /></div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{isRTL ? 'تحرير الرصيف' : 'Release Berth'}</h3>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/25 rounded-lg p-4 mb-4 space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{isRTL ? 'السفينة:' : 'Vessel:'}</span>
                <span className="text-slate-900 dark:text-slate-50 font-medium">{vesselToRelease.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{isRTL ? 'الرصيف:' : 'Wharf:'}</span>
                <span className="text-slate-900 dark:text-slate-50 font-medium">{vesselToRelease.currentWharf}</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-5">
              {isRTL ? 'هل أنت متأكد من تحرير هذا الرصيف؟ سيتم إزالة السفينة من الرصيف وتحديث حالتها.' : 'Are you sure you want to release this berth? The vessel will be removed from the wharf and its status will be updated.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowReleaseModal(false); setVesselToRelease(null); }} disabled={releasing} className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleReleaseBerth} disabled={releasing} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/30 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                {releasing ? <LoadingIndicator type="line-spinner" size="xs" className="text-white" /> : <CheckCircle className="w-4 h-4" />}
                {isRTL ? 'تأكيد التحرير' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
