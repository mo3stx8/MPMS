import api from '../services/api';

// Types based on backend models but adapted for frontend display
export interface Vessel {
  id: string; // Backend uses number, but we can cast to string for frontend consistency
  name: string;
  type: string;
  arrival: string; // mapped from eta
  departure?: string; // mapped from etd
  agent: string; // mapped from owner.name
  status: 'awaiting' | 'scheduled' | 'assigned' | 'docked' | 'loading' | 'unloading' | 'ready'; // Backend status might need mapping
  currentWharf?: string; // mapped from wharf.name
  clearanceStatus: 'none' | 'pending' | 'issued';
}

export interface Wharf {
  id: string;
  name: string;
  status: 'available' | 'occupied';
  vessel?: string; // vessel name if occupied
  capacity: number;
}

export interface Clearance {
  id: string;
  clearanceId: string; // id
  vessel_id?: string;
  vessel: string; // vessel name
  vesselStatus?: string;
  nextPort: string; // Not in backend yet? default to 'Unknown'
  issueTime: string; // issue_date
  expiryTime: string; // expiry_date
  status: 'valid' | 'expiring-soon' | 'expired' | 'pending_clearance' | 'clearance_approved' | 'rejected';
  hoursRemaining: number;
  certificate_path?: string;
  rejection_reason?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string; // created_at
  rawDate: string; // YYYY-MM-DD for date filtering
  action: string; // backend action key (assign_berth, issue_clearance, berth_release, approve_arrival, etc.)
  vessel: string; // details parsed? or just use details
  details: string;
  officer: string; // user.name
  wharf?: string;
  clearanceId?: string;
}

// No initialization needed for real backend
export async function initializeData() {
  return {};
}

// Vessels
export async function getVessels(): Promise<Vessel[]> {
  try {
    // /officer/vessels returns Vessel with wharf and owner
    const response = await api.get('/officer/vessels');
    const backendVessels = response.data;

    // api.get('/officer/clearances') to map clearance status?
    // Optimization: fetch both or assume backend handles it. 
    // For now, simple mapping.

    return backendVessels.map((v: any) => ({
      id: v.id.toString(),
      name: v.name,
      type: v.type,
      arrival: v.eta,
      departure: v.etd,
      agent: v.owner ? v.owner.name : 'Unknown',
      status: v.status, // Ensure backend status matches frontend string literal or map it
      currentWharf: v.wharf ? v.wharf.name : undefined,
      clearanceStatus: 'none', // Default, need logic to check clearance
    }));
  } catch (error) {
    console.error('Error fetching vessels:', error);
    return [];
  }
}

// Wharves
export async function getWharves(): Promise<Wharf[]> {
  try {
    const response = await api.get('/officer/wharves');
    return response.data.map((w: any) => ({
      id: w.id.toString(),
      name: w.name,
      status: w.status,
      capacity: w.capacity,
      // vessel: w.current_vessel ? ... // Backend Wharf model doesn't explicitly link current vessel in default serialization, 
      // but we might infer from getVessels if needed or if Wharf model has 'vessels' relationship.
    }));
  } catch (error) {
    console.error('Error fetching wharves:', error);
    return [];
  }
}

// Berth Assignment
export async function assignBerth(vesselId: string, wharfId: string, eta: string, etd: string, officerName: string) {
  try {
    const response = await api.post(`/officer/vessels/${vesselId}/berth`, {
      wharf_id: wharfId,
      eta,
      etd,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error assigning berth:', error);
    throw error;
  }
}

// Release Berth - Backend endpoint not created yet on PortOfficerController, 
// strictly speaking assignBerth handles 'docked'. Release might need 'update status' endpoint.
// For now, mock or leave throwing.
export async function releaseBerth(vesselId: string, wharfId: string, officerName: string) {
  try {
    const response = await api.delete(`/officer/vessels/${vesselId}/berth`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error releasing berth:', error);
    throw error;
  }
}

// Clearances
export async function getClearances(): Promise<Clearance[]> {
  try {
    const response = await api.get('/officer/clearances');
    return response.data.map((c: any) => {
      // Calculate hours remaining
      const expiry = new Date(c.expiry_date);
      const now = new Date();
      const hours = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

      return {
        id: c.id.toString(),
        clearanceId: `CLR-${c.id}`,
        vessel: c.vessel ? c.vessel.name : 'Unknown',
        nextPort: c.next_port || 'Unknown',
        issueTime: c.issue_date,
        expiryTime: c.expiry_date,
        status: c.status === 'pending_clearance' || c.status === 'rejected' || c.status === 'clearance_approved' ? c.status : (hours < 0 ? 'expired' : (hours < 24 ? 'expiring-soon' : 'valid')),
        hoursRemaining: hours,
        certificate_path: c.certificate_path,
        rejection_reason: c.rejection_reason,
      };
    });
  } catch (error) {
    console.error('Error fetching clearances:', error);
    return [];
  }
}

export async function issueClearance(vessel: string, nextPort: string, officerName: string) {
  try {
    const response = await api.post('/officer/clearance', {
      vessel_name: vessel,
      next_port: nextPort,
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error issuing clearance:', error);
    throw error;
  }
}

export async function approveClearance(id: string) {
  try {
    const response = await api.post(`/officer/clearance/${id}/approve`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error approving clearance:', error);
    throw error;
  }
}

export async function rejectClearance(id: string, reason: string) {
  try {
    const response = await api.post(`/officer/clearance/${id}/reject`, {
      rejection_reason: reason
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error rejecting clearance:', error);
    throw error;
  }
}

// Logs
export async function getLogs(): Promise<LogEntry[]> {
  try {
    const response = await api.get('/officer/logs');
    return response.data.map((l: any) => {
      // Priority chain: static snapshot > FK relationship > string parsing > fallback
      let vesselName = l.vessel_name || (l.vessel ? l.vessel.name : null);

      // Fallback: parse vessel name from details for legacy logs
      if (!vesselName) {
        const details = l.details || '';
        if (details.includes('Scheduled ')) {
          vesselName = details.split('Scheduled ')[1]?.split(' to ')[0];
        } else if (details.includes('Approved vessel ')) {
          vesselName = details.split('Approved vessel ')[1]?.split(' arrival')[0];
        } else if (details.includes('Issued clearance for vessel ')) {
          vesselName = details.split('Issued clearance for vessel ')[1]?.split(' to ')[0];
        } else if (details.includes('Approved clearance for vessel ')) {
          vesselName = details.split('Approved clearance for vessel ')[1]?.split('.')[0]?.split(' Reason')[0];
        } else if (details.includes('Rejected clearance for vessel ')) {
          vesselName = details.split('Rejected clearance for vessel ')[1]?.split('.')[0];
        } else if (details.includes('Released ')) {
          vesselName = details.split('Released ')[1]?.split(' from ')[0];
        } else if (details.includes('Vessel ')) {
          vesselName = details.split('Vessel ')[1]?.split(' has ')[0];
        } else if (details.includes('arrival for vessel ')) {
          vesselName = details.split('arrival for vessel ')[1]?.split('.')[0]?.split(' ')[0];
        } else if (details.includes('anchorage for vessel ')) {
          vesselName = details.split('anchorage for vessel ')[1]?.split('.')[0];
        }
        vesselName = vesselName || 'Unknown Vessel';
      }

      // Extract YYYY-MM-DD from created_at for reliable date filtering
      const createdDate = new Date(l.created_at);
      const rawDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;

      return {
        id: l.id.toString(),
        timestamp: new Date(l.created_at).toLocaleString(),
        rawDate,
        action: l.action,
        vessel: vesselName,
        details: l.details,
        officer: l.user ? l.user.name : 'Officer',
        wharf: l.wharf,
        clearanceId: l.clearance_id,
      };
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
}

// Export Logs as CSV (filter-aware)
export async function exportLogs(params: { action?: string; date?: string; search?: string }): Promise<Blob> {
  const response = await api.get('/officer/logs/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}

// ─── Scheduled Anchorage Handoffs ─────────────────────────────────────────────

export interface ScheduledAnchorage {
  id: number;
  vessel: { id: number; name: string; type: string; imo_number: string; flag: string };
  wharf: { id: number; name: string; capacity: number };
  agent: { id: number; name: string; email: string };
  docking_time: string;
  duration: string;
  reason: string;
  wharf_assigned_at: string;
  status: string;
}

export async function getScheduledAnchorage(): Promise<ScheduledAnchorage[]> {
  try {
    const response = await api.get('/officer/scheduled-anchorage');
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled anchorage:', error);
    return [];
  }
}

// ─── Regulatory Report ────────────────────────────────────────────────────────

export interface ReportWharfage {
  wharf: string;
  time_in: string;
  time_out: string;
  duration: string;
}

export interface PortReportData {
  vessel: {
    id: number;
    name: string;
    imo: string;
    type: string;
  };
  date: string;
  clearance: {
    id: number;
    clearance_id: string;
    status: string;
    issue_date: string;
    expiry_date: string;
    next_port: string;
    officer: string;
  } | null;
  wharfage: ReportWharfage[];
  officer_name: string;
  security_hash: string;
  timestamp: string;
}

export async function getPortReport(vesselName: string, date: string): Promise<PortReportData | null> {
  try {
    const response = await api.get('/officer/report', {
      params: { vessel_name: vesselName, target_date: date }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching port report:', error);
    return null;
  }
}

