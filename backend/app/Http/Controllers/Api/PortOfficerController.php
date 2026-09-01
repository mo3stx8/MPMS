<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vessel;
use App\Models\Wharf;
use App\Models\PortClearance;
use App\Models\Log;
use App\Models\AnchorageRequest;
use App\Events\VesselOperationLogged;
use App\Events\PortClearanceUpdated;

class PortOfficerController extends Controller
{
    /**
     * Returns all anchorage requests that have been approved and assigned by
     * the Wharf worker (status = wharf_assigned). Port Officers use this to
     * have exact visibility on scheduled vessel entries.
     */
    public function getScheduledAnchorage()
    {
        $requests = AnchorageRequest::with(['vessel', 'wharf', 'agent'])
            ->where('status', 'wharf_assigned')
            ->orderBy('docking_time')
            ->get();

        return response()->json($requests);
    }

    public function getDashboardStats()
    {
        return response()->json([
            'active_vessels' => Vessel::whereIn('status', ['docked', 'loading', 'unloading', 'ready'])->count(),
            'awaiting_berth' => Vessel::where('status', 'awaiting')->count(),
            // Assuming 'pending' clearances mean requests, but here counting valid ones for now
            'pending_clearances' => PortClearance::visible()->where('status', 'valid')->count(),
        ]);
    }

    public function getVessels()
    {
        return response()->json(Vessel::with('wharf', 'owner')->get());
    }

    public function approveArrival(Request $request, $id)
    {
        $vessel = Vessel::findOrFail($id);
        // Assuming workflow: awaiting -> approved -> assigned/docked
        $vessel->status = 'approved';
        $vessel->save();

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'approve_arrival',
            'details' => "Approved vessel {$vessel->name} arrival",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in approveArrival: " . $e->getMessage());
        }

        return response()->json($vessel);
    }

    public function assignBerth(Request $request, $id)
    {
        $request->validate([
            'wharf_id' => 'required|exists:wharves,id',
            'eta' => 'required|date',
            'etd' => 'required|date|after:eta',
        ]);

        $vessel = Vessel::findOrFail($id);
        $wharf = Wharf::findOrFail($request->wharf_id);

        // Check for conflicting schedules
        $conflict = Vessel::where('current_wharf_id', $wharf->id)
            ->where('id', '!=', $vessel->id)
            ->where(function ($query) use ($request) {
            $query->where('eta', '<', $request->etd)
                ->where('etd', '>', $request->eta);
        })->exists();

        if ($conflict) {
            return response()->json(['message' => 'Wharf is already booked during this time window'], 400);
        }

        $vessel->current_wharf_id = $wharf->id;
        $vessel->eta = $request->eta;
        $vessel->etd = $request->etd;
        $vessel->status = 'scheduled';
        $vessel->save();

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'assign_berth',
            'details' => "Scheduled {$vessel->name} to {$wharf->name} from {$vessel->eta} to {$vessel->etd}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in assignBerth: " . $e->getMessage());
        }

        return response()->json($vessel);
    }

    public function issueClearance(Request $request)
    {
        $request->validate([
            'vessel_name' => 'required|string|exists:vessels,name',
            'next_port' => 'required|string',
            'expiry_date' => 'required|date',
        ]);

        $vessel = Vessel::where('name', $request->vessel_name)->firstOrFail();

        $existing = PortClearance::where('vessel_id', $vessel->id)
            ->whereIn('status', ['valid', 'clearance_approved'])
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Certificate already issued for this vessel'], 400);
        }

        $clearance = PortClearance::create([
            'vessel_id' => $vessel->id,
            'officer_id' => $request->user()->id,
            'issue_date' => now(),
            'expiry_date' => $request->expiry_date,
            'status' => 'valid',
            'next_port' => $request->next_port,
        ]);

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'issue_clearance',
            'details' => "Issued clearance for vessel {$vessel->name} to {$request->next_port}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in issueClearance: " . $e->getMessage());
        }

        // Broadcast to the vessel's agent for real-time timeline update
        try {
            $agentId = $vessel->owner_id;
            if ($agentId) {
                event(new PortClearanceUpdated($clearance, $agentId));
            }
        } catch (\Exception $e) {
            \Log::error('PortClearanceUpdated broadcast failed in issueClearance: ' . $e->getMessage());
        }

        return response()->json($clearance, 201);
    }

    public function getClearances()
    {
        return response()->json(PortClearance::visible()->with('vessel', 'officer')->get());
    }

    public function approveClearance(Request $request, $id)
    {
        $clearance = PortClearance::with('vessel')->findOrFail($id);
        
        $existing = PortClearance::where('vessel_id', $clearance->vessel_id)
            ->where('id', '!=', $clearance->id)
            ->whereIn('status', ['valid', 'clearance_approved'])
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Certificate already issued for this vessel'], 400);
        }

        $clearance->update([
            'status' => 'clearance_approved',
            'officer_id' => $request->user()->id,
            'issue_date' => now(),
            'expiry_date' => now()->addHours(24),
        ]);

        // Generate Professional PDF
        $vessel = $clearance->vessel;
        $officer = $request->user();
        
        // Handle Signature: Read from storage path and embed as base64 for DOMPDF
        $signatureBase64 = null;
        if ($officer->signature) {
            try {
                $sigStoragePath = str_replace('/storage/', '', $officer->signature);
                if (\Storage::disk('public')->exists($sigStoragePath)) {
                    $sigContent = \Storage::disk('public')->get($sigStoragePath);
                    $sigMime = \Storage::disk('public')->mimeType($sigStoragePath);
                    $signatureBase64 = 'data:' . $sigMime . ';base64,' . base64_encode($sigContent);
                }
            } catch (\Exception $e) {
                \Log::error('Signature read failed: ' . $e->getMessage());
            }
        }

        $signatureHtml = $signatureBase64
            ? "<img src='{$signatureBase64}' style='height: 60px; max-width: 180px; display: block; margin: 0 auto;'>" 
            : "<div style='height: 60px; color: #94a3b8; font-style: italic; line-height: 60px; font-size: 12px;'>No Digital Signature</div>";

        // Yemen emblem: embed local file as base64 for DOMPDF compatibility
        $yemenLogoBase64 = '';
        $yemenLogoPath = public_path('storage/yemen_emblem.png');
        if (file_exists($yemenLogoPath)) {
            $logoContent = file_get_contents($yemenLogoPath);
            $yemenLogoBase64 = 'data:image/png;base64,' . base64_encode($logoContent);
        }

        $html = "
            <html>
            <head>
                <style>
                    @page { margin: 15px; }
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 15px; font-size: 13px; }
                    .border-container { border: 4px double #1e293b; padding: 15px; position: relative; }
                    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 15px; }
                    .logo { height: 70px; margin-bottom: 5px; }
                    .header h1 { font-size: 20px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
                    .header p { margin: 2px 0 0; color: #64748b; font-weight: bold; font-size: 11px; }
                    
                    .cert-body { line-height: 1.5; }
                    .intro { text-align: center; margin-bottom: 10px; font-style: italic; font-size: 13px; }
                    
                    .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    .details-table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
                    .details-table .label { font-weight: bold; background-color: #f8fafc; width: 35%; color: #475569; }
                    .details-table .value { font-weight: 600; color: #0f172a; }
                    
                    .declaration { margin-top: 15px; text-align: justify; border-left: 4px solid #1e293b; padding: 8px 12px; background: #f1f5f9; font-size: 12px; }
                    
                    .footer { margin-top: 25px; }
                    .signature-box { float: right; text-align: center; width: 220px; border-top: 1px solid #1e293b; padding-top: 5px; }
                    
                    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 70px; color: rgba(226, 232, 240, 0.25); z-index: -1; text-transform: uppercase; pointer-events: none; }
                    .clearfix::after { content: ''; clear: both; display: table; }
                </style>
            </head>
            <body>
                <div class='border-container'>
                    <div class='watermark'>OFFICIAL</div>
                    
                    <div class='header'>
                        <img src='{$yemenLogoBase64}' class='logo'>
                        <h1>Republic of Yemen</h1>
                        <p>Ministry of Transport - Manarah Port Authority</p>
                        <h2 style='margin-top: 8px; font-size: 18px; text-transform: uppercase;'>Port Clearance Certificate</h2>
                        <p style='color: #1e293b;'>No: CLR-".str_pad($clearance->id, 6, '0', STR_PAD_LEFT)."</p>
                    </div>

                    <div class='cert-body'>
                        <p class='intro'>To all to whom these presents shall come, Greeting:</p>
                        
                        <p>This is to formally certify that the vessel described below has complied with all port regulations, settled all required dues, and is hereby granted official clearance to depart from Manarah Port.</p>

                        <table class='details-table'>
                            <tr><td class='label'>Vessel Name</td><td class='value'>{$vessel->name}</td></tr>
                            <tr><td class='label'>IMO Number</td><td class='value'>{$vessel->imo_number}</td></tr>
                            <tr><td class='label'>Vessel Type</td><td class='value'>{$vessel->type}</td></tr>
                            <tr><td class='label'>Destination Port</td><td class='value'>{$clearance->next_port}</td></tr>
                            <tr><td class='label'>Issue Date</td><td class='value'>{$clearance->issue_date->format('M d, Y - H:i')}</td></tr>
                            <tr><td class='label'>Expiry Date</td><td class='value'>{$clearance->expiry_date->format('M d, Y - H:i')}</td></tr>
                        </table>

                        <div class='declaration'>
                            <strong>Official Approval Statement:</strong><br>
                            The vessel <strong>{$vessel->name}</strong> has successfully completed all intended cargo operations, safety inspections, and administrative protocols within the jurisdiction of Manarah Port. No outstanding liabilities exist at the time of issuance.
                        </div>

                        <div class='footer clearfix'>
                            <div class='signature-box'>
                                <div style='height: 65px; margin-bottom: 2px;'>{$signatureHtml}</div>
                                <div style='font-weight: bold; font-size: 13px;'>{$officer->name}</div>
                                <div style='font-size: 10px; color: #64748b;'>Authorized Port Officer</div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        ";

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $fileName = 'certificate_' . $vessel->id . '_' . time() . '.pdf';
        
        \Storage::disk('public')->put('certificates/' . $fileName, $pdf->output());
        
        $clearance->update([
            'certificate_path' => '/storage/certificates/' . $fileName,
        ]);

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'approve_clearance',
            'details' => "Approved clearance for vessel {$vessel->name}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in approveClearance: " . $e->getMessage());
        }

        // Broadcast to the vessel's agent for real-time timeline update
        try {
            $agentId = $vessel->owner_id;
            if ($agentId) {
                event(new PortClearanceUpdated($clearance->fresh(), $agentId));
            }
        } catch (\Exception $e) {
            \Log::error('PortClearanceUpdated broadcast failed in approveClearance: ' . $e->getMessage());
        }

        return response()->json($clearance);
    }

    public function rejectClearance(Request $request, $id)
    {
        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        $clearance = PortClearance::with('vessel')->findOrFail($id);
        
        $clearance->update([
            'status' => 'rejected',
            'officer_id' => $request->user()->id,
            'rejection_reason' => $request->rejection_reason,
        ]);

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $clearance->vessel_id,
            'vessel_name' => $clearance->vessel->name,
            'action' => 'reject_clearance',
            'details' => "Rejected clearance for vessel {$clearance->vessel->name}. Reason: {$request->rejection_reason}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in rejectClearance: " . $e->getMessage());
        }

        // Broadcast to the vessel's agent for real-time timeline update
        try {
            $agentId = $clearance->vessel->owner_id;
            if ($agentId) {
                event(new PortClearanceUpdated($clearance->fresh(), $agentId));
            }
        } catch (\Exception $e) {
            \Log::error('PortClearanceUpdated broadcast failed in rejectClearance: ' . $e->getMessage());
        }

        return response()->json($clearance);
    }

    public function getLogs()
    {
        return response()->json(Log::with(['user', 'vessel'])->latest()->take(50)->get());
    }

    public function exportLogs(Request $request)
    {
        $query = Log::with(['user', 'vessel'])->latest();

        // Filter by action type
        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        // Filter by date (YYYY-MM-DD)
        if ($date = $request->query('date')) {
            $query->whereDate('created_at', $date);
        }

        // Filter by vessel name search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('vessel_name', 'like', "%{$search}%")
                  ->orWhereHas('vessel', function ($vq) use ($search) {
                      $vq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->take(200)->get();

        $callback = function () use ($logs) {
            $handle = fopen('php://output', 'w');
            // UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, ['ID', 'Timestamp', 'Action', 'Vessel', 'Details', 'Officer']);

            foreach ($logs as $log) {
                $vesselName = $log->vessel_name ?? ($log->vessel ? $log->vessel->name : 'Unknown');
                fputcsv($handle, [
                    $log->id,
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->action,
                    $vesselName,
                    $log->details,
                    $log->user ? $log->user->name : 'System',
                ]);
            }
            fclose($handle);
        };

        $filename = 'operational_logs_' . now()->format('Y-m-d_His') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }

    public function getWharves()
    {
        return response()->json(Wharf::all());
    }
    public function releaseBerth(Request $request, $id)
    {
        $vessel = Vessel::findOrFail($id);

        if (!$vessel->current_wharf_id) {
            return response()->json(['message' => 'Vessel is not docked'], 400);
        }

        $wharf = Wharf::find($vessel->current_wharf_id);

        // Update Vessel
        $vessel->current_wharf_id = null;
        $vessel->status = 'ready'; // Ready to depart
        $vessel->save();

        // Update Wharf
        if ($wharf) {
            $wharf->status = 'available';
            $wharf->save();
        }

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'berth_release',
            'details' => "Released {$vessel->name} from {$wharf->name}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in releaseBerth: " . $e->getMessage());
        }

        return response()->json($vessel);
    }

    public function getPortReport(Request $request)
    {
        $request->validate([
            'vessel_name' => 'required|string',
            'target_date' => 'required|date',
        ]);

        $vessel = Vessel::where('name', $request->vessel_name)->first();

        if (!$vessel) {
            return response()->json(['message' => 'Vessel not found'], 404);
        }

        $date = $request->target_date;

        // 1. Port Clearance Data (for that date)
        $clearance = PortClearance::where('vessel_id', $vessel->id)
            ->whereDate('issue_date', $date)
            ->with('officer')
            ->first();

        // 2. Wharfage Logs
        $wharfage = AnchorageRequest::where('vessel_id', $vessel->id)
            ->where(function ($query) use ($date) {
                $query->whereDate('docking_time', $date);
            })
            ->where('status', 'wharf_assigned')
            ->with('wharf')
            ->get()
            ->map(function ($log) {
                $timeIn = \Carbon\Carbon::parse($log->docking_time);
                $timeOut = (clone $timeIn)->addHours((int)$log->duration);
                return [
                    'wharf' => $log->wharf ? $log->wharf->name : 'N/A',
                    'time_in' => $timeIn->toDateTimeString(),
                    'time_out' => $timeOut->toDateTimeString(),
                    'duration' => $log->duration . ' hours',
                ];
            });

        // 3. Security Hash
        $securityHash = 'TRANS-' . strtoupper(substr(md5($vessel->name . $date . now()), 0, 8));

        return response()->json([
            'vessel' => [
                'id' => $vessel->id,
                'name' => $vessel->name,
                'imo' => $vessel->imo_number,
                'type' => $vessel->type,
            ],
            'date' => $date,
            'clearance' => $clearance ? [
                'id' => $clearance->id,
                'clearance_id' => 'CLR-' . $clearance->id,
                'status' => $clearance->status,
                'issue_date' => \Carbon\Carbon::parse($clearance->issue_date)->toDateTimeString(),
                'expiry_date' => \Carbon\Carbon::parse($clearance->expiry_date)->toDateTimeString(),
                'next_port' => $clearance->next_port ?? 'Unknown',
                'officer' => $clearance->officer ? $clearance->officer->name : 'System',
            ] : null,
            'wharfage' => $wharfage,
            'officer_name' => $request->user()->name,
            'security_hash' => $securityHash,
            'timestamp' => now()->format('Y-m-d H:i:s'),
        ]);
    }
}
