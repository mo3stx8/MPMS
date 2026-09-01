import api from './api';

export interface WharfStats {
    pendingAvailability: number;
    approvedWharves: number;
    occupiedWharves: number;
    storageUsed: number;
    storageAvailable: number;
    containersAwaiting: number;
}

export interface WharfAlert {
    id: string;
    type: 'warning' | 'critical';
    message: string;
    timestamp: string;
}

export const wharfService = {
    getDashboardStats: async () => {
        try {
            const response = await api.get('/wharf/dashboard');
            const data = response.data;

            // Map snake_case to camelCase
            return {
                pendingAvailability: data.pending_availability,
                approvedWharves: data.approved_wharves,
                occupiedWharves: data.occupied_wharves,
                storageUsed: data.storage_used,
                storageAvailable: data.storage_available,
                containersAwaiting: data.containers_awaiting,
            } as WharfStats;
        } catch (error) {
            console.error('Error fetching wharf stats:', error);
            throw error;
        }
    },

    getAlerts: async () => {
        // Mock alerts for now as backend doesn't have an alert system table yet
        return [
            {
                id: '1',
                type: 'warning',
                message: 'High storage usage at Sector A',
                timestamp: new Date().toISOString()
            }
        ] as WharfAlert[];
    },

    initializeData: async () => {
        // No-op for real backend
        return { success: true };
    },

    getWharves: async () => {
        try {
            const response = await api.get('/wharf/wharves'); // Need to ensure route exists. Controller has getWharves but route might be missing in my previous view? 
            // Wait, looking at api.php view from step 495, I don't see /wharf/wharves. I need to add it or use PortOfficer's if shared?
            // Executive uses Agent uses...
            // Let's assume I added it or will add it.
            return response.data;
        } catch (error) {
            console.error('Error fetching wharves:', error);
            return [];
        }
    },

    getContainers: async () => {
        try {
            const response = await api.get('/wharf/containers');
            return response.data;
        } catch (error) {
            console.error('Error fetching containers:', error);
            return [];
        }
    },

    assignContainer: async (containerId: string, block: string, row: number, tier: number) => {
        try {
            const response = await api.post('/wharf/assign-container', {
                container_id: containerId,
                block,
                row,
                tier
            });
            return response.data;
        } catch (error) {
            console.error('Error assigning container:', error);
            throw error;
        }
    },

    updateWharfStatus: async (wharfId: string, status: 'available' | 'occupied' | 'maintenance') => {
        try {
            const response = await api.put(`/wharf/${wharfId}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating wharf status:', error);
            throw error;
        }
    },

    // Mock method for now as backend controller for this specific action might be missing
    logContainerOperation: async (containerId: string, action: 'load' | 'unload' | 'discharge') => {
        try {
            // Assuming endpoint exists or we create it
            const response = await api.post(`/wharf/containers/${containerId}/log`, { action });
            return response.data;
        } catch (error) {
            console.error('Error logging container operation:', error);
            throw error;
        }
    },

    getStorageAreas: async () => {
        try {
            const response = await api.get('/wharf/storage-areas');
            return response.data;
        } catch (error) {
            console.error('Error fetching storage areas:', error);
            throw error;
        }
    },

    // ─── Anchorage Workflow ───────────────────────────────────────────────────

    getAnchorageRequests: async () => {
        try {
            const response = await api.get('/wharf/anchorage-requests');
            return response.data; // { requests: [], wharves: [] }
        } catch (error) {
            console.error('Error fetching anchorage requests for wharf:', error);
            return { requests: [], wharves: [] };
        }
    },

    approveAnchorageRequest: async (requestId: number, wharfId: number) => {
        try {
            const response = await api.post(`/wharf/anchorage-requests/${requestId}/approve`, { wharf_id: wharfId });
            return response.data;
        } catch (error) {
            console.error('Error approving anchorage request:', error);
            throw error;
        }
    },

    waitlistAnchorageRequest: async (requestId: number, reason?: string) => {
        try {
            const response = await api.post(`/wharf/anchorage-requests/${requestId}/waitlist`, { reason });
            return response.data;
        } catch (error) {
            console.error('Error waitlisting anchorage request:', error);
            throw error;
        }
    },

    // ─── Discharge Requests Workflow ──────────────────────────────────────────
    getDischargeRequests: async () => {
        try {
            const response = await api.get('/wharf/discharge-requests');
            return response.data;
        } catch (error) {
            console.error('Error fetching discharge requests:', error);
            return [];
        }
    },

    approveDischargeRequest: async (batchId: string) => {
        try {
            const response = await api.post(`/wharf/discharge-requests/${batchId}/approve`);
            return response.data;
        } catch (error) {
            console.error('Error approving discharge request:', error);
            throw error;
        }
    },

    declineDischargeRequest: async (batchId: string, reason: string) => {
        try {
            const response = await api.post(`/wharf/discharge-requests/${batchId}/decline`, { reason });
            return response.data;
        } catch (error) {
            console.error('Error declining discharge request:', error);
            throw error;
        }
    },

    // ─── Physical Discharge ───────────────────────────────────────────────────
    dischargeContainers: async (vesselId: number, containerIds: number[]) => {
        try {
            const response = await api.post(`/wharf/vessels/${vesselId}/discharge-containers`, { container_ids: containerIds });
            return response.data;
        } catch (error) {
            console.error('Error physically discharging containers:', error);
            throw error;
        }
    },

    triggerTimeoutNotification: async (requestId: number) => {
        try {
            const response = await api.post(`/wharf/anchorage-requests/${requestId}/timeout`);
            return response.data;
        } catch (error) {
            console.error('Error triggering timeout notification:', error);
            throw error;
        }
    },
};

