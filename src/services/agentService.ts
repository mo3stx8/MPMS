import api from './api';

export interface AgentStats {
    activeVessels: number;
    pendingClearances: number;
    completedOperations: number;
    notifications: number;
}

export interface Activity {
    id: number;
    user_id: number;
    action: string;
    details: string;
    ip_address: string;
    created_at: string;
    updated_at: string;
}

export interface Arrival {
    id: number;
    vessel_name: string;
    imo_number: string;
    status: string;
    eta: string;
    rejection_reason?: string | null;
}

export interface Vessel {
    id: number;
    name: string;
    type: string;
    flag: string;
    eta: string;
    status: string;
    owner_id: number;
    expected_containers?: number | null;
    current_wharf_id?: number | null;
}

export interface CargoManifest {
    id: number;
    vessel_id: number;
    vessel?: Vessel;
    uploaded_by: number;
    status: string;
    file_path: string;
    total_weight: number;
    container_count: number;
    created_at: string;
}

export interface ReportArrival {
    id: number;
    vessel_name: string;
    imo_number: string;
    type: string;
    flag: string;
    eta: string;
    etd: string | null;
    status: string;
    purpose: string | null;
    cargo: string | null;
    priority: string | null;
    priority_reason: string | null;
    expected_containers?: number | null;
    created_at: string;
}

export interface ReportAnchorage {
    id: number;
    status: string;
    docking_time: string;
    duration: number;
    location: string | null;
    reason: string | null;
    rejection_reason: string | null;
    wharf: { id: number; name: string; status: string } | null;
    wharf_assigned_at: string | null;
    created_at: string;
}

export interface ReportClearance {
    id: number;
    clearance_id: string;
    status: string;
    issue_date: string;
    expiry_date: string;
    next_port: string | null;
    officer: { id: number; name: string; email: string } | null;
    certificate_path?: string | null;
    created_at: string;
}

export interface VesselActivityReport {
    vessel: { id: number; name: string; imo: string };
    date: string;
    arrival: ReportArrival | null;
    anchorage: ReportAnchorage | null;
    clearance: ReportClearance | null;
}


export const agentService = {
    getStats: async () => {
        try {
            const response = await api.get('/agent/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching stats', error);
            return {
                activeVessels: 0,
                pendingClearances: 0,
                completedOperations: 0,
                notifications: 0
            };
        }
    },

    getRecentActivity: async () => {
        return [];
    },

    getUpcomingArrivals: async () => {
        try {
            const response = await api.get('/agent/vessels');
            return response.data; // This returns all vessels, which serves as arrival history too
        } catch (error) {
            console.error('Error fetching arrivals', error);
            return [];
        }
    },

    checkIMO: async (imo: string) => {
        try {
            const response = await api.get(`/agent/vessels/check-imo/${imo}`);
            return response.data;
        } catch (error) {
            console.error('Error checking IMO', error);
            throw error;
        }
    },

    submitArrival: async (data: { imo_number: string; name: string; type: string; expected_containers?: number | string | null; flag?: string; eta: string; purpose?: string; cargo?: string; priority?: string; priority_reason?: string; priority_document?: FileList | null }) => {
        try {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'priority_document' && value instanceof FileList && value.length > 0) {
                        formData.append(key, value[0]);
                    } else if (key !== 'priority_document') {
                        formData.append(key, value as string);
                    }
                }
            });
            const response = await api.post('/agent/vessels', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error submitting arrival', error);
            throw error;
        }
    },

    finalizeArrival: async (id: number) => {
        try {
            const response = await api.post(`/agent/vessels/${id}/finalize`);
            return response.data;
        } catch (error) {
            console.error('Error finalizing arrival', error);
            throw error;
        }
    },

    updateArrival: async (id: number, data: { eta: string; type?: string; expected_containers?: number | string | null; flag?: string; name?: string; imo_number?: string; purpose?: string; cargo?: string; priority?: string; priority_reason?: string; priority_document?: FileList | null }) => {
        try {
            const formData = new FormData();
            formData.append('_method', 'PUT'); // Laravel required for PUT with FormData
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'priority_document' && value instanceof FileList && value.length > 0) {
                        formData.append(key, value[0]);
                    } else if (key !== 'priority_document') {
                        formData.append(key, value as string);
                    }
                }
            });
            const response = await api.post(`/agent/vessels/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error updating arrival', error);
            throw error;
        }
    },

    getManifests: async () => {
        try {
            const response = await api.get('/agent/manifests');
            return response.data;
        } catch (error) {
            console.error('Error fetching manifests', error);
            return [];
        }
    },

    submitAnchorageRequest: async (data: any) => {
        try {
            const response = await api.post('/agent/anchorage', data);
            return response.data;
        } catch (error) {
            console.error('Error submitting anchorage request', error);
            throw error;
        }
    },

    updateAnchorageRequest: async (id: number, data: any) => {
        try {
            const response = await api.put(`/agent/anchorage/${id}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating anchorage request', error);
            throw error;
        }
    },

    expandDuration: async (id: number, additionalHours: number) => {
        try {
            const response = await api.post(`/agent/anchorage/${id}/expand-duration`, {
                additional_hours: additionalHours
            });
            return response.data;
        } catch (error) {
            console.error('Error expanding duration:', error);
            throw error;
        }
    },

    getAnchorageRequests: async () => {
        try {
            const response = await api.get('/agent/anchorage');
            return response.data;
        } catch (error) {
            console.error('Error fetching anchorage requests', error);
            return [];
        }
    },

    getTrackerData: async () => {
        try {
            const response = await api.get('/agent/tracker');
            return response.data;
        } catch (error) {
            console.error('Error fetching tracker data', error);
            return [];
        }
    },

    uploadManifest: async (formData: FormData) => {
        try {
            const response = await api.post('/agent/manifests', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading manifest', error);
            throw error;
        }
    },

    updateManifest: async (id: number, formData: FormData) => {
        try {
            // Need to use POST with _method=PUT to handle multipart/form-data with file upload in Laravel
            formData.append('_method', 'PUT');
            const response = await api.post(`/agent/manifests/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error updating manifest', error);
            throw error;
        }
    },

    // Alias for explicit vessel fetching
    getVessels: async () => {
        try {
            const response = await api.get('/agent/vessels');
            return response.data;
        } catch (error) {
            console.error('Error fetching vessels', error);
            return [];
        }
    },

    getClearances: async () => {
        try {
            const response = await api.get('/agent/clearances');
            return response.data.map((c: any) => {
                const expiry = c.expiry_date ? new Date(c.expiry_date) : null;
                const now = new Date();
                let hours = 0;
                let parsedStatus = c.status;
                
                if (expiry && (parsedStatus === 'valid' || parsedStatus === 'clearance_approved')) {
                    hours = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
                    if (hours < 0) parsedStatus = 'expired';
                    else if (hours < 24) parsedStatus = 'expiring-soon';
                    else parsedStatus = 'valid';
                    
                    if (c.status === 'clearance_approved') parsedStatus = 'clearance_approved';
                }

                return {
                    id: c.id.toString(),
                    clearanceId: `CLR-${c.id}`,
                    vessel_id: c.vessel_id,
                    vessel: c.vessel ? c.vessel.name : 'Unknown',
                    vesselStatus: c.vessel ? c.vessel.status : null,
                    // Full vessel object for PDF export
                    vesselData: c.vessel ? {
                        name: c.vessel.name,
                        imo_number: c.vessel.imo_number,
                        type: c.vessel.type,
                        flag: c.vessel.flag,
                    } : null,
                    officer: c.officer ? { name: c.officer.name } : null,
                    nextPort: c.next_port || 'Unknown',
                    issueTime: c.issue_date,
                    expiryTime: c.expiry_date,
                    status: c.status === 'pending_clearance' || c.status === 'rejected' ? c.status : parsedStatus,
                    hoursRemaining: hours,
                    certificate_path: c.certificate_path,
                    rejection_reason: c.rejection_reason,
                };
            });
        } catch (error) {
            console.error('Error fetching clearances', error);
            return [];
        }
    },

    requestClearance: async (vesselName: string, nextPort: string) => {
        try {
            const response = await api.post('/agent/clearance/request', {
                vessel_name: vesselName,
                next_port: nextPort,
            });
            return response.data;
        } catch (error) {
            console.error('Error requesting clearance', error);
            throw error;
        }
    },

    issueClearance: async (vesselName: string, nextPort: string) => {
        try {
            const response = await api.post('/agent/clearance', {
                vessel_name: vesselName,
                next_port: nextPort,
            });
            return response.data;
        } catch (error) {
            console.error('Error issuing clearance', error);
            throw error;
        }
    },

    updateClearance: async (id: number, nextPort: string) => {
        try {
            const response = await api.put(`/agent/clearance/${id}`, {
                next_port: nextPort,
            });
            return response.data;
        } catch (error) {
            console.error('Error updating clearance', error);
            throw error;
        }
    },

    executeDeparture: async (vesselId: number) => {
        try {
            const response = await api.post(`/agent/vessels/${vesselId}/depart`);
            return response.data;
        } catch (error) {
            console.error('Error executing departure', error);
            throw error;
        }
    },

    getVesselActivityReport: async (vesselId?: number | '', date?: string): Promise<VesselActivityReport | VesselActivityReport[] | null> => {
        try {
            const params: any = {};
            if (vesselId) params.vessel_id = vesselId;
            if (date) params.date = date;

            const response = await api.get('/agent/vessel-report', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching vessel activity report', error);
            return null;
        }
    },

    emergencyExit: async (vesselId: number, exitReason: string) => {
        try {
            const response = await api.post(`/agent/vessels/${vesselId}/emergency-exit`, {
                exit_reason: exitReason,
            });
            return response.data;
        } catch (error) {
            console.error('Error executing emergency exit', error);
            throw error;
        }
    },
};
