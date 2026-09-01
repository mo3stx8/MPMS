import { API_BASE_URL } from '@/services/api';

/**
 * Agent PDF Export Utility
 *
 * Opens a dedicated popup window, injects the styled HTML report,
 * and triggers window.print() inside it — avoiding all inline-style
 * specificity conflicts and the "page goes black" bug from injecting
 * hidden divs into the main document.
 */

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return dateStr; }
}

function tableRow(label: string, value: string | number | null | undefined, i: number): string {
  const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
  return `<tr style="background:${bg}">
    <td style="padding:8px 16px;font-weight:700;color:#374151;width:38%;border-bottom:1px solid #e5e7eb;font-size:11.5px">${label}</td>
    <td style="padding:8px 16px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11.5px">${value ?? '—'}</td>
  </tr>`;
}


function buildDocumentHtml(opts: {
  docType: string;
  docTypeLabel: string;
  accentColor: string;
  vesselName: string;
  vesselImo: string;
  vesselType?: string | null;
  vesselFlag?: string | null;
  rows: string;
  extraBlocks?: string;
  signatureUrl?: string | null;
  userName?: string | null;
  customSigGrid?: string;
}): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { dateStyle: 'long' });
  const timeStr = now.toLocaleString();
  const hash = `MSP-${opts.docType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${opts.docTypeLabel} — ${opts.vesselName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'IBM Plex Sans Arabic', sans-serif; color: #111827; background: white; padding: 32px 36px; font-size: 12px; }
    @page { size: A4 portrait; margin: 14mm 12mm; }
    @media print { body { padding: 0; } button { display: none !important; } }

    /* ──── Header ──── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid ${opts.accentColor}; padding-bottom: 18px; margin-bottom: 26px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, ${opts.accentColor}, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .port-name { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #6b7280; text-transform: uppercase; }
    .report-title { font-size: 20px; font-weight: 900; color: #111827; margin: 2px 0; }
    .doc-type-label { font-size: 11px; color: #6b7280; }
    .doc-type-label strong { color: ${opts.accentColor}; }
    .header-right { text-align: right; font-size: 10.5px; color: #4b5563; line-height: 1.9; }
    .official-badge { margin-top: 8px; padding: 3px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; display: inline-block; color: #1d4ed8; font-weight: 700; font-size: 9px; letter-spacing: 1px; }

    /* ──── Vessel Card ──── */
    .vessel-card { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px; display: flex; align-items: center; gap: 16px; }
    .vessel-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #0284c7, #0ea5e9); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .vessel-name { font-size: 16px; font-weight: 900; color: #0c4a6e; }
    .vessel-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
    .vessel-meta span { font-size: 10.5px; font-weight: 700; color: #0369a1; background: white; border: 1px solid #bae6fd; border-radius: 20px; padding: 2px 10px; }

    /* ──── Section ──── */
    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .section-dot { width: 8px; height: 8px; border-radius: 50%; background: ${opts.accentColor}; }
    .section-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #6b7280; text-transform: uppercase; }
    .section-name { font-size: 14px; font-weight: 900; color: #111827; margin-bottom: 8px; margin-left: 16px; }

    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
    thead td { background: ${opts.accentColor}11; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: ${opts.accentColor}; padding: 10px 16px; border-bottom: 2px solid ${opts.accentColor}33; }

    /* ──── Rejection ──── */
    .rejection { margin: 12px 0; padding: 12px 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; font-size: 11px; color: #9f1239; }
    .rejection strong { display: block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }

    /* ──── Signature ──── */
    .sig-area { margin-top: 36px; border-top: 2px solid #111827; padding-top: 20px; }
    .sig-title { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-bottom: 24px; }
    .sig-field label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; display: block; margin-bottom: 4px; }
    .sig-field .sig-line { border-bottom: 1px solid #111827; min-height: 26px; font-size: 11px; font-weight: 700; }
    .sig-field.right { text-align: right; }
    .sig-field.right .sig-line { margin-left: auto; min-width: 160px; margin-top: 24px; }
    .hash-box { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 16px; text-align: center; }
    .hash-label { font-size: 8px; text-transform: uppercase; font-weight: 700; color: #9ca3af; letter-spacing: 1px; margin-bottom: 4px; }
    .hash-value { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: #374151; }
    .disclaimer { font-size: 8px; color: #9ca3af; margin-top: 8px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }

    /* ──── Footer ──── */
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 8.5px; color: #9ca3af; }

    /* ──── Print Button (only shown on screen) ──── */
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: ${opts.accentColor}; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px ${opts.accentColor}44; }
    .print-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">⚓</div>
      <div>
        <div class="port-name">Manarah Sea Port</div>
        <div class="report-title">Official Port Activity Report</div>
        <div class="doc-type-label">Document Type: <strong>${opts.docTypeLabel}</strong></div>
      </div>
    </div>
    <div class="header-right">
      <div><strong>Report Date:</strong> ${dateStr}</div>
      <div><strong>Generated:</strong> ${timeStr}</div>
      <div class="official-badge">OFFICIAL DOCUMENT</div>
    </div>
  </div>

  <!-- Vessel Information Card -->
  <div class="vessel-card">
    <div class="vessel-icon">🚢</div>
    <div>
      <div class="vessel-name">${opts.vesselName}</div>
      <div class="vessel-meta">
        ${opts.vesselImo ? `<span>IMO: ${opts.vesselImo}</span>` : ''}
        ${opts.vesselType ? `<span>Type: ${opts.vesselType}</span>` : ''}
        ${opts.vesselFlag ? `<span>Flag: ${opts.vesselFlag}</span>` : ''}
      </div>
    </div>
  </div>

  <!-- Document Section -->
  <div class="section-title">
    <div class="section-dot"></div>
    <div class="section-label">Section 1 — Document Details</div>
  </div>
  <div class="section-name">${opts.docTypeLabel}</div>

  <table>
    <thead><tr><td colspan="2">Document Information</td></tr></thead>
    <tbody>${opts.rows}</tbody>
  </table>

  ${opts.extraBlocks ?? ''}

  <!-- Signature Block -->
  <div class="sig-area">
    <div class="sig-title">Validation &amp; Authorization</div>
    ${opts.customSigGrid ? opts.customSigGrid : `
    <div class="sig-grid">
      <div class="sig-field">
        <label>Authenticated Agent</label>
        <div class="sig-line">${opts.userName || '&nbsp;'}</div>
      </div>
      <div class="sig-field">
        <label>Extraction Timestamp</label>
        <div class="sig-line">${timeStr}</div>
      </div>
      <div class="sig-field right">
        <label>Official Signature / Stamp</label>
        <div class="sig-line">
          ${opts.signatureUrl ? `<img src="${opts.signatureUrl}" style="max-height: 40px; margin-top: -10px; display: block; margin-left: auto;" alt="Signature" />` : ''}
        </div>
      </div>
    </div>
    `}
    <div class="hash-box">
      <div class="hash-label">System Authentication Hash</div>
      <div class="hash-value">${hash}</div>
    </div>
    <div class="disclaimer">
      This document is issued by the Manarah Sea Port Management System and serves as a primary record of regulatory compliance.
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Manarah Sea Port Management System — Confidential</span>
    <span>${opts.docType.toUpperCase()}_${opts.vesselName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf</span>
    <span>Page 1 of 1</span>
  </div>

  <!-- Print Button (hidden during actual print) -->
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

  <script>
    // Auto-trigger print after a short delay to let the page render
    setTimeout(() => window.print(), 600);
  </script>
</body>
</html>`;
}

function openPrintWindow(html: string, filename: string) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site and try again.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = filename;
}

/**
 * Normalise any signature value into a usable image URL.
 * Handles: data URIs, absolute URLs, relative storage paths, raw base64.
 */
function normalizeSignatureUrl(sig: string | null | undefined): string | null {
  if (!sig) return null;

  // Clean up any whitespace or newlines that might break the data URI
  sig = sig.trim().replace(/\n|\r/g, '');
  if (!sig) return null;

  // If it's already a Data URI, return as is
  if (sig.startsWith('data:image')) {
    return sig;
  }

  // If it's an absolute URL, return as is
  if (sig.startsWith('http://') || sig.startsWith('https://')) {
    return sig;
  }

  // If it's a relative path (e.g. /storage/signatures/...)
  // Append the backend URL dynamically using the resolved API_BASE_URL
  if (sig.startsWith('/')) {
    return `${API_BASE_URL}${sig}`;
  }

  // Otherwise, assume it's raw base64 and prefix it
  return `data:image/png;base64,${sig}`;
}

/** Get the current logged-in user's signature from localStorage. */
function getSignatureUrl(): string | null {
  return normalizeSignatureUrl(localStorage.getItem('user_signature'));
}

// ─── Public Exports ────────────────────────────────────────────────────────

export interface ArrivalExportData {
  vessel_name: string;
  imo_number: string;
  type?: string | null;
  flag?: string | null;
  eta?: string | null;
  status: string;
  purpose?: string | null;
  cargo?: string | null;
  priority?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
}

export interface AnchorageExportData {
  id: number;
  status: string;
  docking_time?: string | null;
  duration?: number | null;
  reason?: string | null;
  rejection_reason?: string | null;
  wharf?: { name: string } | null;
  vessel?: { name: string; imo_number?: string; type?: string; flag?: string } | null;
  created_at?: string | null;
}

export interface ClearanceExportData {
  id: number;
  status: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  next_port?: string | null;
  vessel?: { name: string; imo_number?: string; type?: string; flag?: string } | null;
  officer?: { name: string } | null;
}

export function exportArrivalPdf(n: ArrivalExportData) {
  const filename = `ARRIVAL_Report_${n.vessel_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  const rows = [
    tableRow('Vessel Name', n.vessel_name, 0),
    tableRow('IMO Number', n.imo_number, 1),
    tableRow('Vessel Type', n.type, 2),
    tableRow('Country of Flag', n.flag, 3),
    tableRow('Expected Arrival (ETA)', fmt(n.eta), 4),
    tableRow('Purpose of Visit', n.purpose, 5),
    tableRow('Cargo Description', n.cargo, 6),
    tableRow('Priority Level', n.priority || 'Low', 7),
    tableRow('Official Status', n.status?.toUpperCase(), 8),
    tableRow('Submitted On', fmt(n.created_at), 9),
  ].join('');

  const extra = n.rejection_reason
    ? `<div class="rejection"><strong>⚠ Executive Rejection Reason</strong>${n.rejection_reason}</div>`
    : '';

  const html = buildDocumentHtml({
    docType: 'ARRIVAL',
    docTypeLabel: 'Arrival Approval Notification',
    accentColor: '#2563eb',
    vesselName: n.vessel_name,
    vesselImo: n.imo_number,
    vesselType: n.type,
    vesselFlag: n.flag,
    rows,
    extraBlocks: extra,
    signatureUrl: getSignatureUrl(),
    userName: localStorage.getItem('user_name'),
  });

  openPrintWindow(html, filename);
}

export function exportAnchoragePdf(r: AnchorageExportData) {
  const vesselName = r.vessel?.name || 'Unknown Vessel';
  const filename = `ANCHORAGE_Request_${vesselName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  const rows = [
    tableRow('Vessel Name', vesselName, 0),
    tableRow('IMO Number', r.vessel?.imo_number, 1),
    tableRow('Vessel Type', r.vessel?.type, 2),
    tableRow('Country of Flag', r.vessel?.flag, 3),
    tableRow('Request ID', `#${r.id}`, 4),
    tableRow('Docking Time', fmt(r.docking_time), 5),
    tableRow('Duration Requested', r.duration != null ? `${r.duration} hour(s)` : '—', 6),
    tableRow('Reason for Docking', r.reason, 7),
    tableRow('Wharf Assigned', r.wharf?.name, 8),
    tableRow('Official Status', r.status?.toUpperCase().replace(/_/g, ' '), 9),
    tableRow('Submitted On', fmt(r.created_at), 10),
  ].join('');

  const extra = r.rejection_reason
    ? `<div class="rejection"><strong>⚠ Rejection / Waitlist Reason</strong>${r.rejection_reason}</div>`
    : '';

  const html = buildDocumentHtml({
    docType: 'ANCHORAGE',
    docTypeLabel: 'Anchorage Request',
    accentColor: '#7c3aed',
    vesselName,
    vesselImo: r.vessel?.imo_number || '—',
    vesselType: r.vessel?.type,
    vesselFlag: r.vessel?.flag,
    rows,
    extraBlocks: extra,
    signatureUrl: getSignatureUrl(),
    userName: localStorage.getItem('user_name'),
  });

  openPrintWindow(html, filename);
}

export function exportClearancePdf(c: ClearanceExportData) {
  const vesselName = c.vessel?.name || 'Unknown Vessel';
  const filename = `CLEARANCE_Certificate_${vesselName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  const rows = [
    tableRow('Vessel Name', vesselName, 0),
    tableRow('IMO Number', c.vessel?.imo_number, 1),
    tableRow('Vessel Type', c.vessel?.type, 2),
    tableRow('Country of Flag', c.vessel?.flag, 3),
    tableRow('Clearance ID', `CLR-${c.id}`, 4),
    tableRow('Next Port of Call', c.next_port, 5),
    tableRow('Issue Date & Time', fmt(c.issue_date), 6),
    tableRow('Expiry Date & Time', fmt(c.expiry_date), 7),
    tableRow('Official Status', c.status?.toUpperCase(), 8),
    tableRow('Issued By', c.officer?.name || 'Port Authority System', 9),
  ].join('');

  const html = buildDocumentHtml({
    docType: 'CLEARANCE',
    docTypeLabel: 'Port Clearance Certificate',
    accentColor: '#059669',
    vesselName,
    vesselImo: c.vessel?.imo_number || '—',
    vesselType: c.vessel?.type,
    vesselFlag: c.vessel?.flag,
    rows,
    signatureUrl: getSignatureUrl(),
    userName: localStorage.getItem('user_name'),
  });

  openPrintWindow(html, filename);
}

export interface DischargeExportData {
  batch_id: string;
  vessel: { name: string; imo_number?: string; type?: string; flag?: string } | null;
  trader?: { name: string; email?: string; signature?: string | null; signature_base64?: string | null } | null;
  status: string;
  requested_date: string;
  rejection_reason?: string | null;
  notes?: string | null;
  containers: any[];
  created_at: string;
  wharf_signature_base64?: string | null;
  wharf_officer_name?: string | null;
}

export function exportDischargeRequestPdf(d: DischargeExportData, role: 'trader' | 'wharf') {
  const vesselName = d.vessel?.name || 'Unknown Vessel';
  const filename = `DISCHARGE_Request_${d.batch_id}_${new Date().toISOString().split('T')[0]}.pdf`;

  const rows = [
    tableRow('Request Batch ID', d.batch_id, 0),
    tableRow('Vessel Name', vesselName, 1),
    tableRow('Trader', d.trader?.name || localStorage.getItem('user_name'), 2),
    tableRow('Requested Date', fmt(d.requested_date), 3),
    tableRow('Number of Containers', d.containers.length.toString(), 4),
    tableRow('Official Status', d.status.toUpperCase(), 5),
    tableRow('Submitted On', fmt(d.created_at), 6),
  ].join('');

  const extra = d.rejection_reason
    ? `<div class="rejection"><strong>⚠ Rejection Reason</strong>${d.rejection_reason}</div>`
    : '';

  const timeStr = new Date().toLocaleString();
  
  // Trader signature: current user's own sig when trader, otherwise from API data
  const traderSig = role === 'trader'
    ? getSignatureUrl()
    : normalizeSignatureUrl(d.trader?.signature_base64 || d.trader?.signature);
  const traderName = d.trader?.name || localStorage.getItem('user_name');
  
  // Wharf signature: current user's own sig when wharf, otherwise from API data
  const wharfSig = role === 'wharf' && d.status !== 'pending'
    ? getSignatureUrl()
    : normalizeSignatureUrl(d.status === 'approved' ? d.wharf_signature_base64 : null);

  const wharfName = role === 'wharf'
    ? localStorage.getItem('user_name')
    : (d.status === 'approved' ? (d.wharf_officer_name || 'Wharf Officer') : null);

  const customSigGrid = `
    <div class="sig-grid" style="grid-template-columns: 1fr 1fr 1fr;">
      <div class="sig-field">
        <label>Trader / Consignee</label>
        <div class="sig-line" style="min-height: 50px; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start;">
          ${traderSig ? `<img src="${traderSig}" style="max-height: 40px; display: block;" alt="Trader Signature" />` : ''}
          <span style="margin-top: 4px;">${traderName || '&nbsp;'}</span>
        </div>
      </div>
      <div class="sig-field">
        <label>Extraction Timestamp</label>
        <div class="sig-line" style="min-height: 50px; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start;">
          <span style="margin-top: 4px;">${timeStr}</span>
        </div>
      </div>
      <div class="sig-field right">
        <label>Wharf Authority</label>
        <div class="sig-line" style="min-height: 50px; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end;">
          ${wharfSig ? `<img src="${wharfSig}" style="max-height: 40px; display: block; margin-left: auto;" alt="Wharf Signature" />` : (d.status === 'approved' ? '<span style="color: #059669; font-style: italic;">Approved by Wharf</span>' : '&nbsp;')}
          <span style="margin-top: 4px;">${wharfName || (d.status === 'approved' ? 'Wharf Officer' : '&nbsp;')}</span>
        </div>
      </div>
    </div>
  `;

  const html = buildDocumentHtml({
    docType: 'DISCHARGE',
    docTypeLabel: 'Container Discharge Request',
    accentColor: '#ea580c',
    vesselName,
    vesselImo: d.vessel?.imo_number || '—',
    vesselType: d.vessel?.type,
    vesselFlag: d.vessel?.flag,
    rows,
    extraBlocks: extra,
    customSigGrid,
    userName: localStorage.getItem('user_name'),
  });

  openPrintWindow(html, filename);
}
