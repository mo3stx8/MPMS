import api from './api';

export interface TraderStats {
    arrived: number;
    stored: number;
    readyForDischarge: number;
    unreadNotifications: number;
    pendingDischarges: number;
    statusChangeAlerts: number;
}

export const traderService = {
    getDashboardStats: async () => {
        try {
            const response = await api.get('/trader/dashboard');
            const data = response.data;

            return {
                arrived: data.arrived,
                stored: data.stored,
                readyForDischarge: data.ready_for_discharge,
                unreadNotifications: data.unread_notifications,
                pendingDischarges: data.pending_discharges,
                statusChangeAlerts: data.status_change_alerts,
            } as TraderStats;
        } catch (error) {
            console.error('Error fetching trader stats:', error);
            throw error;
        }
    },

    initializeData: async (email: string) => {
        // No-op
        return { success: true };
    },

    getContainers: async () => {
        try {
            const response = await api.get('/trader/containers');
            return response.data;
        } catch (error) {
            console.error('Error fetching trader containers:', error);
            return [];
        }
    },

    requestDischarge: async (vesselId: number, containerIds: number[], requestedDate: string, notes?: string) => {
        try {
            const response = await api.post('/trader/discharge-request', { vessel_id: vesselId, container_ids: containerIds, requested_date: requestedDate, notes });
            return response.data;
        } catch (error) {
            console.error('Error requesting discharge:', error);
            throw error;
        }
    },

    getDischargeRequests: async () => {
        try {
            const response = await api.get('/trader/discharge-requests');
            return response.data;
        } catch (error) {
            console.error('Error fetching discharge requests:', error);
            return [];
        }
    }
};
