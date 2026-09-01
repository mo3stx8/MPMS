<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Log;
use App\Models\Vessel;
use App\Models\AnchorageRequest;
use App\Models\User;
use App\Models\Notification;
use App\Events\VesselOperationLogged;

class ExecutiveController extends Controller
{
    public function getLogs(Request $request)
    {
        $logs = Log::with(['user', 'vessel.owner'])->latest()->take(50)->get();

        $mappedLogs = $logs->map(function ($log) {
            $actionStr = strtolower($log->action ?? '');
            
            $decision = 'info';
            if (str_contains($actionStr, 'reject')) {
                $decision = 'rejected';
            } elseif (str_contains($actionStr, 'approve')) {
                $decision = 'approved';
            }

            $type = 'other';
            if (str_contains($actionStr, 'arrival')) {
                $type = 'arrival';
            } elseif (str_contains($actionStr, 'anchorage')) {
                $type = 'anchorage';
            }

            return [
                'id' => 'LOG-' . str_pad($log->id, 3, '0', STR_PAD_LEFT),
                'type' => $type,
                'vessel' => $log->vessel_name ?? ($log->vessel ? $log->vessel->name : 'N/A'),
                'agent' => ($log->vessel && $log->vessel->owner) ? $log->vessel->owner->name : 'Unknown',
                'decision' => $decision,
                'decidedBy' => $log->user ? $log->user->name : 'System',
                'timestamp' => $log->created_at->format('Y-m-d H:i'),
                'justification' => $log->details,
            ];
        });

        // Filter to only include decision-type logs (approved or rejected)
        $decisionLogs = $mappedLogs->filter(function ($log) {
            return in_array($log['decision'], ['approved', 'rejected']);
        })->values();

        return response()->json($decisionLogs);
    }

    public function getReports(Request $request)
    {
        return response()->json([
            'total_vessels' => Vessel::count(),
            'vessels_by_status' => Vessel::selectRaw('status, count(*) as count')->groupBy('status')->get(),
            'logs_count' => Log::count(),
        ]);
    }

    public function getAnalytics(Request $request)
    {
        // 1. Turnaround Time Data (Mocking historical trend based on recent arrivals)
        // Ideally this would group by month and calculate average difference between arrival and departure.
        $turnaroundData = [
            ['name' => 'Jan', 'avg' => 24, 'target' => 36],
            ['name' => 'Feb', 'avg' => 22, 'target' => 36],
            ['name' => 'Mar', 'avg' => 18, 'target' => 36],
            ['name' => 'Apr', 'avg' => 26, 'target' => 36],
            ['name' => 'May', 'avg' => 20, 'target' => 36],
            ['name' => 'Jun', 'avg' => 16, 'target' => 36],
        ];

        // 2. Rejection Reasons (Grouping logs where action is reject)
        $rejectionLogs = Log::where('action', 'like', '%reject%')->get();
        $rejectionReasons = [
            ['name' => 'Documentation Incomplete', 'value' => 45, 'color' => '#f87171'],
            ['name' => 'Security Concerns', 'value' => 25, 'color' => '#fbbf24'],
            ['name' => 'Capacity Full', 'value' => 20, 'color' => '#60a5fa'],
            ['name' => 'Other', 'value' => 10, 'color' => '#a78bfa'],
        ];

        // 3. Performance Metrics
        $totalVessels = Vessel::count();
        $avgTurnaround = 21; // Mock average
        
        $approvals = Log::where('action', 'like', '%approve%')->count();
        $rejections = Log::where('action', 'like', '%reject%')->count();
        $totalDecisions = $approvals + $rejections;
        $approvalRate = $totalDecisions > 0 ? round(($approvals / $totalDecisions) * 100) : 100;

        $performanceMetrics = [
            'avgTurnaround' => $avgTurnaround . 'h',
            'approvalRate' => $approvalRate . '%',
            'activeIncidents' => 2, // Mock 
            'operationalEfficiency' => '94%', // Mock
            'dailyDecisions' => Log::whereDate('created_at', today())->count(),
        ];

        // 5. Timeline Heatmap (past 7 weeks, 5 days each based on logs)
        $heatmapData = [];
        for ($w = 0; $w < 7; $w++) {
            $weekData = [];
            for ($d = 0; $d < 5; $d++) {
                $date = now()->subDays((6 - $w) * 7 + (4 - $d));
                $count = Log::whereDate('created_at', $date)->count();
                $weekData[] = $count;
            }
            $heatmapData[] = $weekData;
        }

        // 4. Recent Reports (From Database)
        $recentReports = \App\Models\Report::latest()->take(3)->get()->map(function($r) {
            return [
                'id' => $r->id,
                'title' => $r->title,
                'type' => $r->type,
                'date' => $r->created_at->format('Y-m-d'),
                'size' => $r->size,
                'file_url' => asset('storage/' . $r->file_path)
            ];
        });

        return response()->json([
            'turnaroundData' => $turnaroundData,
            'rejectionReasons' => $rejectionReasons,
            'performanceMetrics' => $performanceMetrics,
            'recentReports' => $recentReports,
            'heatmapData' => $heatmapData,
        ]);
    }

    public function generateReport(Request $request)
    {
        $request->validate([
            'dateRange' => 'required|string',
            'reportType' => 'required|in:Performance,Operational,Rejections,Comprehensive,DecisionLogs',
            'format' => 'required|in:PDF,Excel,CSV',
            'decisionType' => 'nullable|string|in:All,Approved,Rejected,all,approved,rejected',
        ]);

        $dateRangeStr = $request->dateRange;
        // Map date range to timestamps
        $endDate = now();
        if (str_contains(strtolower($dateRangeStr), 'last 7')) {
            $startDate = now()->subDays(7);
        } elseif (str_contains(strtolower($dateRangeStr), '30')) {
            $startDate = now()->subDays(30);
        } elseif (str_contains(strtolower($dateRangeStr), 'last month')) {
            $startDate = now()->subMonth()->startOfMonth();
            $endDate = now()->subMonth()->endOfMonth();
        } elseif (str_contains(strtolower($dateRangeStr), 'this year')) {
            $startDate = now()->startOfYear();
        } elseif (str_contains(strtolower($dateRangeStr), 'all time')) {
            $startDate = now()->subYears(20); // effectively all time
        } else {
            $startDate = now()->subDays(7);
        }

        // ─── Data Routing & Retrieval ───
        $reportType = strtolower($request->input('reportType', 'performance'));
        $data = [
            'title' => $request->input('reportType') . ' Report',
            'reportType' => $request->input('reportType'),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
        ];

        switch ($reportType) {
            case 'performance':
                $approvals = Log::where('action', 'like', '%approve%')->whereBetween('created_at', [$startDate, $endDate])->count();
                $rejections = Log::where('action', 'like', '%reject%')->whereBetween('created_at', [$startDate, $endDate])->count();
                $totalDecisions = $approvals + $rejections;
                
                $data = array_merge($data, [
                    'avgTurnaround' => 21.4, // Mock calculation
                    'approvalRate' => $totalDecisions > 0 ? round(($approvals / $totalDecisions) * 100) : 100,
                    'totalVessels' => Vessel::whereBetween('created_at', [$startDate, $endDate])->count(),
                    'efficiency' => 94,
                    'throughput' => Vessel::selectRaw('type, count(*) as count')->whereBetween('created_at', [$startDate, $endDate])->groupBy('type')->get(),
                    'turnaroundTrends' => [
                        ['name' => 'Current Period', 'avg' => 21.4, 'target' => 24],
                        ['name' => 'Previous Period', 'avg' => 23.1, 'target' => 24],
                    ],
                ]);
                break;

            case 'operational':
                $data = array_merge($data, [
                    'vesselCount' => Vessel::whereBetween('created_at', [$startDate, $endDate])->count(),
                    'clearanceCount' => \App\Models\PortClearance::whereBetween('created_at', [$startDate, $endDate])->count(),
                    'logCount' => Log::whereBetween('created_at', [$startDate, $endDate])->count(),
                    'vesselsByStatus' => Vessel::selectRaw('status, count(*) as count')->whereBetween('created_at', [$startDate, $endDate])->groupBy('status')->get(),
                    'recentLogs' => Log::whereBetween('created_at', [$startDate, $endDate])->latest()->take(15)->get(),
                ]);
                break;

            case 'rejections':
                $data = array_merge($data, [
                    'rejectionCount' => Log::where('action', 'like', '%reject%')->whereBetween('created_at', [$startDate, $endDate])->count(),
                    'rejectionLogs' => Log::where('action', 'like', '%reject%')->whereBetween('created_at', [$startDate, $endDate])->latest()->get(),
                    'rejectionReasons' => [
                        ['name' => 'Documentation Incomplete', 'value' => 45],
                        ['name' => 'Security Concerns', 'value' => 25],
                        ['name' => 'Capacity Full', 'value' => 20],
                        ['name' => 'Other', 'value' => 10],
                    ],
                ]);
                break;

            case 'decisionlogs':
                $query = Log::with(['user', 'vessel.owner'])->whereBetween('created_at', [$startDate, $endDate]);
                $decType = strtolower($request->input('decisionType', 'all'));
                
                if ($decType === 'approved') {
                    $query->where('action', 'like', '%approve%');
                } elseif ($decType === 'rejected') {
                    $query->where('action', 'like', '%reject%');
                } else {
                    $query->where(function($q) {
                        $q->where('action', 'like', '%approve%')
                          ->orWhere('action', 'like', '%reject%');
                    });
                }

                $logs = $query->latest()->get()->map(function ($log) {
                    $actionStr = strtolower($log->action ?? '');
                    $decision = 'info';
                    if (str_contains($actionStr, 'reject')) $decision = 'rejected';
                    elseif (str_contains($actionStr, 'approve')) $decision = 'approved';

                    $type = 'other';
                    if (str_contains($actionStr, 'arrival')) $type = 'arrival';
                    elseif (str_contains($actionStr, 'anchorage')) $type = 'anchorage';

                    return [
                        'id' => 'LOG-' . str_pad($log->id, 3, '0', STR_PAD_LEFT),
                        'type' => $type,
                        'vessel' => $log->vessel_name ?? ($log->vessel ? $log->vessel->name : 'N/A'),
                        'agent' => ($log->vessel && $log->vessel->owner) ? $log->vessel->owner->name : 'Unknown',
                        'decision' => $decision,
                        'decidedBy' => $log->user ? $log->user->name : 'System',
                        'timestamp' => $log->created_at->format('Y-m-d H:i'),
                        'justification' => $log->details,
                    ];
                });

                $data = array_merge($data, [
                    'logs' => $logs,
                    'decisionType' => $decType
                ]);
                break;

            default: // Comprehensive / Other
                $data = array_merge($data, [
                    'vesselCount' => Vessel::count(),
                    'approvalRate' => '92%',
                    'summary' => 'Comprehensive port activity summary including vessels, logs, and decisions.',
                ]);
                break;
        }

        $requestFormat = $request->input('format', 'PDF');
        $ext = strtolower($requestFormat) === 'excel' ? 'csv' : strtolower($requestFormat);
        $fileName = 'Report_' . ucfirst($reportType) . '_' . time() . '.' . $ext;
        $path = 'reports/' . $fileName;

        if ($ext === 'pdf') {
            $template = "pdf.reports." . (in_array($reportType, ['performance', 'operational', 'rejections', 'comprehensive', 'decisionlogs']) ? $reportType : 'operational');
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($template, $data);
            \Illuminate\Support\Facades\Storage::disk('public')->put($path, $pdf->output());
        } else {
            // CSV Generation
            $csvContent = "Manarah Port Authority - " . $data['reportType'] . " Report\n";
            $csvContent .= "Date Range:," . $data['startDate'] . ",to," . $data['endDate'] . "\n\n";
            
            foreach ($data as $key => $value) {
                if (is_scalar($value)) {
                    $csvContent .= ucfirst($key) . "," . $value . "\n";
                }
            }
            \Illuminate\Support\Facades\Storage::disk('public')->put($path, $csvContent);
        }

        $sizeBytes = \Illuminate\Support\Facades\Storage::disk('public')->size($path);
        
        if ($sizeBytes >= 1048576) {
            $readableSize = number_format($sizeBytes / 1048576, 1) . ' MB';
        } else {
            $readableSize = number_format($sizeBytes / 1024, 1) . ' KB';
        }

        $report = \App\Models\Report::create([
            'title' => $reportType . ' - ' . now()->format('M d'),
            'type' => $requestFormat,
            'file_path' => $path,
            'size' => $readableSize,
            'generated_by' => $request->user()->id,
            'report_date_from' => $startDate->toDateString(),
            'report_date_to' => $endDate->toDateString(),
        ]);

        return response()->json([
            'message' => 'Report generated successfully',
            'report' => [
                'id' => $report->id,
                'title' => $report->title,
                'type' => $report->type,
                'date' => $report->created_at->format('Y-m-d'),
                'size' => $report->size,
                'file_url' => asset('storage/' . $report->file_path)
            ]
        ]);
    }

    public function getDashboardStats()
    {
        // Calculate approval rate from logs (approvals vs rejections)
        $approvals = Log::where('action', 'like', '%approve%')->count();
        $rejections = Log::where('action', 'like', '%reject%')->count();
        $totalDecisions = $approvals + $rejections;
        $approvalRate = $totalDecisions > 0 ? round(($approvals / $totalDecisions) * 100) . '%' : '100%';

        return response()->json([
            'pending_approvals' => Vessel::where('status', 'awaiting')->count(),
            'pending_users' => User::where('status', User::STATUS_PENDING)->count(),
            'blocked_requests' => 0, // Mock logic
            'approval_rate' => $approvalRate,
            'today_decisions' => Log::whereDate('created_at', today())->count(),
        ]);
    }

    public function getPendingApprovals()
    {
        // Eagerly load owner; try containers but gracefully handle if migration hasn't run
        try {
            $vessels = Vessel::where('status', 'awaiting')
                ->with(['owner', 'containers'])
                ->get();
        } catch (\Exception $e) {
            // containers table may not have vessel_id yet — load without it
            $vessels = Vessel::where('status', 'awaiting')
                ->with('owner')
                ->get();
        }

        $mapped = $vessels->map(function($v) {
                $cargoType = 'General Cargo';
                $typeStr = strtolower($v->type ?? '');
                if ($typeStr === 'tanker') {
                    $cargoType = 'Liquid Bulk';
                } elseif ($typeStr === 'container') {
                    $cargoType = 'Container Cargo';
                } elseif ($typeStr === 'bulk') {
                    $cargoType = 'Dry Bulk';
                } elseif ($typeStr === 'ro-ro') {
                    $cargoType = 'Vehicles/Ro-Ro';
                }

                // Build real manifest documents from the containers table (if loaded)
                $manifestDocuments = [];
                $containerCount = 0;
                if ($v->relationLoaded('containers')) {
                    $manifestDocuments = $v->containers->map(function($container) {
                        return [
                            'id' => $container->id,
                            'name' => basename($container->manifest_file_path),
                            'url' => asset('storage/' . $container->manifest_file_path),
                            'storage_type' => $container->storage_type,
                            'consignee_name' => $container->consignee_name,
                            'extraction_status' => $container->extraction_status,
                            'extraction_errors' => $container->extraction_errors,
                        ];
                    })->values()->toArray();
                    $containerCount = $v->containers->count();
                }

                return [
                    'id' => 'REQ-' . $v->id,
                    'vesselId' => $v->id,
                    'type' => 'arrival',
                    'vessel' => [
                        'name' => $v->name,
                        'imo' => $v->imo_number ?? 'N/A',
                        'flag' => $v->flag ?? '🏳️',
                        'type' => $v->type,
                    ],
                    'agent' => [
                        'name' => $v->owner ? $v->owner->name : 'Unknown Agent',
                        'contact' => $v->owner ? $v->owner->email : 'N/A'
                    ],
                    'purpose' => $v->purpose ?? 'Cargo operations',
                    'priority' => strtolower($v->priority ?? 'low'),
                    'priorityReason' => $v->priority_reason,
                    'priorityDocumentPath' => $v->priority_document_path ? asset('storage/' . $v->priority_document_path) : null,
                    'riskLevel' => $v->type === 'Tanker' ? 'high' : 'low',
                    'cargoType' => current(array_filter([$v->cargo, $cargoType])) ?: $cargoType,
                    'containers' => $containerCount,
                    'documents' => $manifestDocuments,
                    'submittedDate' => $v->created_at->format('Y-m-d H:i'),
                    'eta' => $v->eta ? \Carbon\Carbon::parse($v->eta)->format('Y-m-d H:i') : 'N/A',
                ];
            });

        return response()->json($mapped);
    }

    public function approveArrival(Request $request, $id)
    {
        $vessel = Vessel::findOrFail($id);
        $vessel->status = 'approved';
        $vessel->save();

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'approve_arrival',
            'details' => "Executive approved arrival for vessel {$vessel->name}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in approveArrival: " . $e->getMessage());
        }

        Notification::create([
            'user_id' => $vessel->owner_id,
            'title' => 'Arrival Approved',
            'message' => "Executive management has approved the arrival notification for vessel {$vessel->name}.",
            'type' => 'arrival_approved',
            'data' => json_encode(['name' => $vessel->name]),
        ]);

        return response()->json($vessel);
    }

    public function rejectArrival(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string',
            'rejected_manifest_ids' => 'sometimes|array',
            'rejected_manifest_ids.*' => 'exists:containers,id'
        ]);

        $vessel = Vessel::findOrFail($id);
        $vessel->status = 'rejected';
        $vessel->rejection_reason = $request->reason;
        $vessel->save();

        // Update specific manifests if provided
        if ($request->has('rejected_manifest_ids') && !empty($request->rejected_manifest_ids)) {
            \App\Models\Container::whereIn('id', $request->rejected_manifest_ids)
                ->where('vessel_id', $vessel->id)
                ->update(['status' => 'rejected_by_executive']);
        }

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $vessel->id,
            'vessel_name' => $vessel->name,
            'action' => 'reject_arrival',
            'details' => "Executive rejected arrival for vessel {$vessel->name}. Reason: {$request->reason}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in rejectArrival: " . $e->getMessage());
        }

        Notification::create([
            'user_id' => $vessel->owner_id,
            'title' => 'Arrival Rejected',
            'message' => "Executive management has rejected the arrival notification for vessel {$vessel->name}. Reason: {$request->reason}",
            'type' => 'arrival_rejected',
            'data' => json_encode(['name' => $vessel->name, 'reason' => $request->reason]),
        ]);

        return response()->json([
            'vessel' => $vessel,
            'message' => 'Arrival rejected successfully and manifests flagged.'
        ]);
    }

    public function getRecentDecisions()
    {
        // Filter logs for decision-like actions
        return response()->json(Log::whereIn('action', ['approve_arrival', 'assign_berth', 'issue_clearance', 'reject_request'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function($l) {
                $decision = str_contains($l->action, 'reject') ? 'rejected' : 'approved';
                return [
                    'id' => 'DEC-' . $l->id,
                    'type' => str_contains($l->action, 'arrival') ? 'arrival' : 'other',
                    'vessel' => $l->details, // Simplified parsing
                    'decision' => $decision,
                    'time' => $l->created_at->diffForHumans(),
                ];
            }));
    }

    public function getAnchorageRequests()
    {
        $requests = AnchorageRequest::with(['vessel.owner', 'agent'])
            ->latest()
            ->get()
            ->map(function ($req) {
                 // Check if it can be approved based on vessel status (must be approved first)
                 $req->canApprove = $req->vessel && $req->vessel->status === 'approved';
                 return $req;
            });

        return response()->json($requests);
    }

    public function approveAnchorage(Request $request, $id)
    {
        $anchorage = AnchorageRequest::findOrFail($id);
        $anchorage->status = 'approved';
        $anchorage->save();

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $anchorage->vessel_id,
            'vessel_name' => $anchorage->vessel->name,
            'action' => 'approve_anchorage',
            'details' => "Approved anchorage for vessel {$anchorage->vessel->name}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in approveAnchorage: " . $e->getMessage());
        }

        Notification::create([
            'user_id' => $anchorage->agent_id,
            'title' => 'Anchorage Approved',
            'message' => "Executive management has approved the anchorage request for vessel {$anchorage->vessel->name}.",
            'type' => 'anchorage_approved',
            'data' => json_encode(['vessel' => $anchorage->vessel->name]),
        ]);

        return response()->json($anchorage);
    }

    public function rejectAnchorage(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string'
        ]);

        $anchorage = AnchorageRequest::findOrFail($id);
        $anchorage->status = 'rejected';
        $anchorage->rejection_reason = $request->reason;
        $anchorage->save();

        $log = Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $anchorage->vessel_id,
            'vessel_name' => $anchorage->vessel->name,
            'action' => 'reject_anchorage',
            'details' => "Rejected anchorage for vessel {$anchorage->vessel->name}",
        ]);
        try {
            event(new VesselOperationLogged($log, $request->user()->name));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed in rejectAnchorage: " . $e->getMessage());
        }

        Notification::create([
            'user_id' => $anchorage->agent_id,
            'title' => 'Anchorage Rejected',
            'message' => "Executive management has rejected the anchorage request for vessel {$anchorage->vessel->name}. Reason: {$request->reason}",
            'type' => 'anchorage_rejected',
            'data' => json_encode(['vessel' => $anchorage->vessel->name, 'reason' => $request->reason]),
        ]);

        return response()->json($anchorage);
    }

    public function getPendingUsers(Request $request)
    {
        return response()->json(User::where('status', User::STATUS_PENDING)->get());
    }

    public function approveUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->status = User::STATUS_ACTIVE;
        // Optionally mark verified as true if that's still being used
        $user->verified = true; 
        $user->save();

        Log::create([
            'user_id' => $request->user()->id,
            'action' => 'approve_user',
            'details' => "Executive approved account for {$user->name} ({$user->email})",
        ]);

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Account Approved',
            'message' => "Welcome! Your account has been approved by executive management.",
            'type' => 'user_approved',
            'data' => json_encode(['name' => $user->name]),
        ]);

        return response()->json([
            'message' => 'User account approved successfully.',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }

    public function rejectUser(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string'
        ]);

        $user = User::findOrFail($id);
        $user->status = User::STATUS_REJECTED;
        $user->rejection_reason = $request->reason;
        $user->save();

        Log::create([
            'user_id' => $request->user()->id,
            'action' => 'reject_user',
            'details' => "Executive rejected account for {$user->name} ({$user->email}). Reason: {$request->reason}",
        ]);

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Account Rejected',
            'message' => "Your account request was rejected. Reason: {$request->reason}",
            'type' => 'user_rejected',
            'data' => json_encode(['reason' => $request->reason]),
        ]);

        return response()->json([
            'message' => 'User account rejected successfully.',
            'user' => $user
        ]);
    }

    /**
     * Get comprehensive vessel history for a specific vessel.
     * Supports lookup by database ID or IMO number.
     */
    public function getVesselHistory(Request $request, $id)
    {
        // Try to find by ID first, then by IMO number
        $vessel = Vessel::with(['owner', 'wharf', 'clearances'])->find($id);

        if (!$vessel) {
            // Try by IMO number
            $vessel = Vessel::with(['owner', 'wharf', 'clearances'])
                ->where('imo_number', $id)
                ->first();
        }

        if (!$vessel) {
            return response()->json(['message' => 'Vessel not found'], 404);
        }

        // Aggregate totalArrivals: count all vessels with same IMO number (multiple port calls)
        $totalArrivals = 1;
        if ($vessel->imo_number) {
            $totalArrivals = Vessel::where('imo_number', $vessel->imo_number)->count();
        }

        // Aggregate totalDepartures: count of clearances issued for this vessel
        $totalDepartures = $vessel->clearances ? $vessel->clearances->count() : 0;

        // Determine cargoType from vessel data
        $cargoType = $vessel->cargo ?? 'General Cargo';
        if (!$vessel->cargo) {
            $typeStr = strtolower($vessel->type ?? '');
            if ($typeStr === 'tanker') {
                $cargoType = 'Liquid Bulk';
            } elseif ($typeStr === 'container') {
                $cargoType = 'Container Cargo';
            } elseif ($typeStr === 'bulk') {
                $cargoType = 'Dry Bulk';
            } elseif ($typeStr === 'ro-ro') {
                $cargoType = 'Vehicles/Ro-Ro';
            }
        }

        // Determine previousPort from the most recent clearance's next_port
        $previousPort = 'N/A';
        if ($vessel->clearances && $vessel->clearances->count() > 0) {
            $latestClearance = $vessel->clearances->sortByDesc('created_at')->first();
            if ($latestClearance && $latestClearance->next_port) {
                $previousPort = $latestClearance->next_port;
            }
        }

        // Build the vessel data payload with the exact required fields
        $vesselData = [
            'id' => $vessel->id,
            'name' => $vessel->name,
            'vesselName' => $vessel->name,
            'imo' => $vessel->imo_number ?? 'N/A',
            'imoNumber' => $vessel->imo_number ?? 'N/A',
            'flag' => $vessel->flag ?? '🏳️',
            'type' => $vessel->type,
            'status' => $vessel->status,
            'cargoType' => $cargoType,
            'previousPort' => $previousPort,
            'arrivalDate' => $vessel->eta ? \Carbon\Carbon::parse($vessel->eta)->format('Y-m-d H:i') : 'N/A',
            'departureDate' => $vessel->etd ? \Carbon\Carbon::parse($vessel->etd)->format('Y-m-d H:i') : 'N/A',
            'totalArrivals' => $totalArrivals,
            'totalDepartures' => $totalDepartures,
            'owner' => $vessel->owner ? $vessel->owner->name : 'Unknown',
            'wharf' => $vessel->wharf ? $vessel->wharf->name : 'Not Assigned',
        ];

        // Build historical timeline from logs mentioning this vessel, sorted newest first
        $historyQuery = Log::where('details', 'like', "%{$vessel->name}%")
            ->orderBy('created_at', 'desc');

        $paginatedHistory = $historyQuery->paginate(10, ['*'], 'page', $request->query('page', 1));

        // Map log entries to timeline items
        $historyData = collect($paginatedHistory->items())->map(function ($log) {
            // Determine event type from action
            $typeMap = [
                'approve_arrival' => 'Arrival Approved',
                'reject_arrival' => 'Arrival Rejected',
                'assign_berth' => 'Wharfage Assignment',
                'issue_clearance' => 'Port Clearance',
                'approve_anchorage' => 'Anchorage Approved',
                'reject_anchorage' => 'Anchorage Rejected',
                'submit_arrival' => 'Arrival Registration',
                'upload_manifest' => 'Cargo Manifest Upload',
            ];

            $type = $typeMap[$log->action] ?? ucwords(str_replace('_', ' ', $log->action));

            // Determine status from action
            $status = 'completed';
            if (str_contains($log->action, 'reject')) {
                $status = 'rejected';
            } elseif (str_contains($log->action, 'pending') || str_contains($log->action, 'submit')) {
                $status = 'pending';
            } elseif (str_contains($log->action, 'approve')) {
                $status = 'approved';
            }

            return [
                'id' => 'EVT-' . $log->id,
                'type' => $type,
                'status' => $status,
                'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
                'details' => $log->details,
            ];
        });

        return response()->json([
            'vessel' => $vesselData,
            'history' => [
                'data' => $historyData->values(),
                'current_page' => $paginatedHistory->currentPage(),
                'last_page' => $paginatedHistory->lastPage(),
                'total' => $paginatedHistory->total(),
            ],
        ]);
    }

    /**
     * Get a searchable list of all vessels for the vessel selector/picker.
     */
    public function getAllVessels(Request $request)
    {
        $query = Vessel::query()->select('id', 'name', 'imo_number', 'type', 'flag', 'status', 'eta', 'etd', 'created_at');

        // Search filter by name or IMO number
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('imo_number', 'like', "%{$search}%");
            });
        }

        $vessels = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($vessels);
    }

    public function getEmergencyExits()
    {
        $vessels = Vessel::where('status', 'emergency_departed')
            ->with('owner')
            ->orderBy('emergency_departed_at', 'desc')
            ->get()
            ->map(function ($vessel) {
                return [
                    'id' => $vessel->id,
                    'vesselName' => $vessel->name,
                    'imoNumber' => $vessel->imo_number,
                    'agentName' => $vessel->owner ? $vessel->owner->name : 'Unknown',
                    'exitTimestamp' => $vessel->emergency_departed_at,
                    'exitReason' => $vessel->exit_reason,
                    'vesselType' => $vessel->type,
                    'flag' => $vessel->flag,
                ];
            });

        return response()->json($vessels);
    }
}
