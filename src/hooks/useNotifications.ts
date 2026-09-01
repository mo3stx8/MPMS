import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { User } from '../App';

export interface NotificationItem {
  id: string | number;
  operationId: string | number;
  senderName: string;
  senderRole: string;
  operationType: string;
  submittedTimestamp: string;
  status: string;
  message: string;
  route?: string;
  type?: string;
  data?: any;
}

const fetchNotifications = async (user: User): Promise<NotificationItem[]> => {
  let synthesized: NotificationItem[] = [];

  try {
    switch (user.role) {
      case 'executive':
        // Fetch pending arrivals
        const { data: approvals } = await api.get('/executive/approvals');
        synthesized = (approvals || []).map((item: any) => ({
          id: `arr-${item.id}`,
          operationId: item.id,
          senderName: item.agent?.name || 'Agent',
          senderRole: 'agent',
          operationType: 'Arrival Approval',
          submittedTimestamp: item.submittedDate,
          status: 'pending',
          message: `Arrival Request ${item.id} awaiting approval`,
          type: 'arrival_approval_pending',
          data: { id: item.id },
          route: `/executive/approvals`,
        }));
        break;

      case 'officer':
        const { data: vessels } = await api.get('/officer/vessels');
        synthesized = (vessels || [])
          .filter((v: any) => v.status === 'awaiting' || v.status === 'scheduled')
          .map((v: any) => ({
            id: `vess-${v.id}`,
            operationId: `REQ-${v.id}`,
            senderName: v.owner?.name || 'Agent',
            senderRole: 'agent',
            operationType: v.status === 'awaiting' ? 'Arrival Approval' : 'Berth Assignment',
            submittedTimestamp: v.created_at,
            status: v.status === 'awaiting' ? 'pending' : 'unread',
            message: `Vessel ${v.name} is ${v.status === 'awaiting' ? 'awaiting arrival approval' : 'scheduled'}`,
            type: v.status === 'awaiting' ? 'vessel_awaiting_approval' : 'vessel_scheduled',
            data: { name: v.name },
            route: `/officer/active-vessels`,
          }));
        break;

      case 'agent':
        const { data: trackerData } = await api.get('/agent/tracker');
        synthesized = (trackerData || [])
          .filter((item: any) => item.status === 'pending' || item.status === 'rejected')
          .map((item: any) => ({
            id: `trk-${item.id}`,
            operationId: item.id,
            senderName: 'System / Port Officer',
            senderRole: 'system',
            operationType: item.title,
            submittedTimestamp: item.submittedDate,
            status: item.status,
            message: `${item.title} for ${item.vessel} is ${item.status}`,
            type: item.type === 'arrival' 
              ? (item.status === 'pending' ? 'vessel_awaiting_approval' : 'vessel_rejected') 
              : (item.type === 'anchorage' ? 'anchorage_request_new' : 'manifest_updated'),
            data: { name: item.vessel, status: item.status },
            route: `/agent/tracker`,
          }));
        break;

      case 'wharf':
        const [wharvesRes, anchorageRes, dischargeRes] = await Promise.all([
          api.get('/wharf/wharves').catch(() => ({ data: [] })),
          api.get('/wharf/anchorage-requests').catch(() => ({ data: { requests: [] } })),
          api.get('/wharf/discharge-requests').catch(() => ({ data: [] }))
        ]);
        
        const availableCount = (wharvesRes.data || []).filter((w: any) => w.status === 'available').length;
        const requestsData = Array.isArray(anchorageRes.data) ? anchorageRes.data : (anchorageRes.data?.requests || []);
        const dischargeData = dischargeRes.data || [];
        
        const anchorageNotifications = requestsData
          .filter((r: any) => r.status === 'pending' || r.status === 'waiting')
          .map((r: any) => ({
            id: `wharf-ar-${r.id}`,
            operationId: `AR-${r.id}`,
            senderName: r.agent?.name || r.vessel?.owner?.name || 'Agent',
            senderRole: 'agent',
            operationType: 'Anchorage Request',
            submittedTimestamp: r.created_at,
            status: r.status === 'waiting' ? 'unread' : 'pending',
            message: r.status === 'waiting' 
                ? (availableCount > 0 ? `Capacity available: ${availableCount} wharves free for waiting vessel ${r.vessel?.name || 'Unknown'}` : `Vessel ${r.vessel?.name || 'Unknown'} is waitlisted.`)
                : `New anchorage request for ${r.vessel?.name || 'Unknown'}`,
            type: r.status === 'waiting' ? 'vessel_waitlisted' : 'anchorage_request_new',
            data: { 
              name: r.vessel?.name || 'Unknown', 
              vessel: r.vessel?.name || 'Unknown', 
              count: availableCount 
            },
            route: `/wharf/availability`,
          }));

        const dischargeNotifications = dischargeData
          .filter((d: any) => d.status === 'pending')
          .map((d: any) => ({
            id: `wharf-dr-${d.batch_id}`,
            operationId: `DR-${d.batch_id}`,
            senderName: d.trader?.name || 'Trader',
            senderRole: 'trader',
            operationType: 'Discharge Request',
            submittedTimestamp: d.created_at,
            status: 'pending',
            message: `New discharge request from ${d.trader?.name || 'Trader'} for ${d.vessel?.name || 'Unknown Vessel'}`,
            type: 'discharge_request_new',
            data: {
              vessel: d.vessel?.name || 'Unknown Vessel',
              trader: d.trader?.name || 'Trader',
              batch_id: d.batch_id,
              count: (d.containers || []).length
            },
            route: `/wharf/discharge`,
          }));

        synthesized = [...anchorageNotifications, ...dischargeNotifications];
        break;
    }
  } catch (error) {
    console.error('Error fetching synthesized notifications:', error);
  }

  // Fetch actual DB notifications
  let dbNotifications: NotificationItem[] = [];
  try {
    const { data } = await api.get('/notifications');
    dbNotifications = (data || []).map((n: any) => ({
      id: `db-${n.id}`,
      operationId: n.id,
      senderName: 'System',
      senderRole: 'system',
      operationType: n.type || 'Notification',
      submittedTimestamp: n.created_at,
      status: n.read_at ? 'read' : 'unread',
      message: n.message,
      type: n.type,
      data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : undefined,
      route: n.type === 'anchorage_timeout' ? '/agent/anchorage' : undefined,
    }));
  } catch (e) {
    console.error('Error fetching DB notifications:', e);
  }

  return [...synthesized, ...dbNotifications].sort((a, b) => 
    new Date(b.submittedTimestamp).getTime() - new Date(a.submittedTimestamp).getTime()
  );
};

export const useNotifications = (user: User | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id, user?.role],
    queryFn: () => fetchNotifications(user!),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string | number) => {
      const dbId = typeof id === 'string' && id.startsWith('db-') ? id.replace('db-', '') : id;
      return api.post(`/notifications/${dbId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    ...query,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
};
