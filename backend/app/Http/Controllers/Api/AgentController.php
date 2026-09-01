<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vessel;
use App\Models\CargoManifest;
use App\Models\AnchorageRequest;
use App\Models\PortClearance;
use App\Http\Requests\StoreArrivalNotificationRequest;
use App\Http\Requests\StoreAnchorageRequest;
use App\Http\Requests\StoreVesselArrivalRequest;
use App\Http\Requests\UploadManifestRequest;
use App\Services\AgentService;
use Illuminate\Support\Facades\Storage;
use App\Models\Notification;
use App\Models\User;
use App\Models\Log;
use App\Events\PortClearanceRequested;

class AgentController extends Controller
{
    public function checkIMO($imo)
    {
        // Get the latest record to populate fields (name, flag, etc.)
        $vessel = Vessel::where('imo_number', $imo)->latest()->first();

        if ($vessel) {
            // Check if there is an ACTIVE notification for this vessel
            // (One that isn't finished or rejected)
            $isActive = !in_array($vessel->status, ['departed', 'archived', 'rejected']);
            
            // Only expose the minimal identifying fields needed for IMO validation.
            // Full operational details (cargo, ETA, status timestamps, owner, etc.)
            // are intentionally withheld to avoid leaking another agent's vessel data.
            return response()->json([
                'found' => true,
                'vessel' => [
                    'id' => $vessel->id,
                    'name' => $vessel->name,
                    'imo_number' => $vessel->imo_number,
                    'flag' => $vessel->flag,
                    'type' => $vessel->type,
                ],
                'is_active' => $isActive,
                'is_owner' => $vessel->owner_id === auth()->id()
            ]);
        }

        return response()->json([
            'found' => false,
            'message' => 'Vessel not found'
        ]);
    }

    public function submitArrival(StoreVesselArrivalRequest $request, AgentService $agentService)
    {
        $data = $request->validated();
        if ($request->hasFile('priority_document')) {
            $data['priority_document_path'] = $request->file('priority_document')->store('priority_documents', 'public');
        }
        $vessel = $agentService->processArrival($data, $request->user()->id);

        return response()->json($vessel, 201);
    }

    public function uploadManifest(UploadManifestRequest $request)
    {

        // Ensure user owns vessel
        $vessel = Vessel::where('id', $request->vessel_id)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();

        $path = $request->file('file')->store('manifests');

        $manifest = CargoManifest::create([
            'vessel_id' => $request->vessel_id,
            'uploaded_by' => $request->user()->id,
            'status' => 'pending',
            'file_path' => $path,
            'total_weight' => $request->total_weight,
            'container_count' => $request->container_count,
        ]);

        return response()->json($manifest, 201);
    }

    public function getVessels(Request $request)
    {
        // Include ALL non-archived vessels, including 'departed' ones.
        // Departed vessels must remain visible in the export dropdown so the agent
        // can still pull their Anchorage Request and Port Clearance PDFs as
        // permanent historical records after the vessel has left the port.
        $vessels = Vessel::where('owner_id', $request->user()->id)
            ->where('status', '!=', 'archived')
            ->with(['manifests', 'owner', 'containers'])
            ->latest()
            ->get();
        return response()->json($vessels);
    }

    public function getManifests(Request $request)
    {
        $manifests = CargoManifest::where('uploaded_by', $request->user()->id)->with('vessel')->get();
        return response()->json($manifests);
    }

    public function submitAnchorageRequest(StoreAnchorageRequest $request, AgentService $agentService)
    {
        // Ensure vessel belongs to agent and is approved
        $vessel = Vessel::where('id', $request->vessel_id)
            ->where('owner_id', $request->user()->id)
            ->where('status', 'approved')
            ->first();

        if (!$vessel) {
            return response()->json(['message' => 'Vessel not found or not approved for anchorage'], 404);
        }

        $anchorageRequest = $agentService->processAnchorageRequest($request->validated(), $request->user()->id);

        return response()->json($anchorageRequest, 201);
    }

    public function getAnchorageRequests(Request $request)
    {
        $requests = AnchorageRequest::where('agent_id', $request->user()->id)
            ->with('vessel')
            ->latest()
            ->get();

        return response()->json($requests);
    }

    public function getClearances(Request $request)
    {
        // Only return non-archived clearances for vessels owned by the agent
        $vessels = Vessel::where('owner_id', $request->user()->id)->pluck('id');
        $clearances = PortClearance::visible()
            ->whereIn('vessel_id', $vessels)
            ->with('vessel', 'officer')
            ->orderBy('created_at', 'desc')
            ->get()
            ->unique('vessel_id')
            ->values();

        return response()->json($clearances);
    }

    public function requestClearance(Request $request)
    {
        $request->validate([
            'vessel_name' => 'required|string',
            'next_port' => 'nullable|string',
        ]);

        $vessel = Vessel::where('name', $request->vessel_name)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();

        // ── Workflow Sequence Guard ─────────────────────────────────────────
        // A Port Clearance can only be requested AFTER the vessel has
        // completed the Anchorage phase (AnchorageRequest status must be
        // 'wharf_assigned' or 'approved').  Vessels that are only
        // 'arrival approved' and have NOT been anchored are rejected here.
        $anchoredRequest = AnchorageRequest::where('vessel_id', $vessel->id)
            ->whereIn('status', ['wharf_assigned', 'approved'])
            ->exists();

        if (!$anchoredRequest) {
            return response()->json([
                'message' => 'Port Clearance cannot be requested until the vessel has completed the Anchorage phase. Please ensure an Anchorage Request has been approved first.',
                'error_code' => 'ANCHORAGE_NOT_COMPLETED',
            ], 422);
        }

        // ── Physical Discharge Guard ───────────────────────────────────────────
        // Prevent Port Clearance if the vessel still has containers that haven't
        // been physically discharged to the wharf (status 'pending').
        $pendingContainers = $vessel->containers()->where('status', 'pending')->count();
        if ($pendingContainers > 0) {
            return response()->json([
                'message' => "Cannot request Port Clearance: The vessel still has {$pendingContainers} container(s) that have not been physically discharged to the wharf.",
                'error_code' => 'PENDING_CONTAINERS_ON_VESSEL',
            ], 422);
        }
        // ───────────────────────────────────────────────────────────────────

        // Ensure there is no existing pending clearance
        if ($vessel->clearances()->where('status', 'pending_clearance')->exists()) {
            return response()->json(['message' => 'Clearance already requested'], 400);
        }

        $clearance = PortClearance::create([
            'vessel_id' => $vessel->id,
            'officer_id' => null, // Allowed to be NULL in DB
            'issue_date' => now(), // Dummy value, overwritten on approval
            'expiry_date' => now()->addHours(24), // Dummy value, overwritten on approval
            'status' => 'pending_clearance',
            'next_port' => $request->next_port,
        ]);

        // Broadcast to the agent's private channel for real-time timeline update
        try {
            event(new PortClearanceRequested($clearance, $request->user()->id));
        } catch (\Exception $e) {
            \Log::error('Broadcasting failed in requestClearance: ' . $e->getMessage());
        }

        return response()->json($clearance, 201);
    }

    public function issueClearance(Request $request)
    {
        // Existing legacy method, kept for backward compatibility if needed,
        // but now the flow is through requestClearance -> approveClearance.
        $request->validate([
            'vessel_name' => 'required|string',
            'next_port' => 'nullable|string',
        ]);

        $vessel = Vessel::where('name', $request->vessel_name)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();

        $clearance = PortClearance::create([
            'vessel_id' => $vessel->id,
            'officer_id' => null,
            'issue_date' => now(),
            'expiry_date' => now()->addHours(24),
            'status' => 'valid',
            'next_port' => $request->next_port,
        ]);

        return response()->json($clearance, 201);
    }

    public function executeDeparture(Request $request, $id)
    {
        $vessel = Vessel::where('id', $id)->where('owner_id', $request->user()->id)->firstOrFail();

        // Must have an approved clearance
        if (!$vessel->clearances()->where('status', 'clearance_approved')->exists()) {
            return response()->json(['message' => 'Vessel cannot depart without approved clearance'], 403);
        }

        \DB::beginTransaction();
        try {
            // Wharf Automation
            // Assuming Wharf is App\Models\Wharf
            if ($vessel->current_wharf_id) {
                \App\Models\Wharf::where('id', $vessel->current_wharf_id)->update(['status' => 'available']);
            }

            // Update Anchorage Request status to Left Wharf
            \App\Models\AnchorageRequest::where('vessel_id', $vessel->id)
                ->where('status', 'wharf_assigned')
                ->update(['status' => 'left_wharf']);

            // Vessel State Update
            $vessel->update([
                'current_wharf_id' => null,
                'status' => 'departed',
                'etd' => now(),
            ]);

            // Stamp departure time on active clearances for the 24h archive grace period
            PortClearance::where('vessel_id', $vessel->id)
                ->where('status', 'clearance_approved')
                ->update(['departed_at' => now()]);

            // Trader Notification (Gracefully Skipped)
            // ...

            // Executive Notification (Log)
            $log = \App\Models\Log::create([
                'user_id' => $request->user()->id,
                'vessel_id' => $vessel->id,
                'vessel_name' => $vessel->name,
                'action' => 'vessel_departure',
                'details' => "Vessel {$vessel->name} has successfully departed.",
            ]);
            try {
                event(new \App\Events\VesselOperationLogged($log, $request->user()->name));
            } catch (\Exception $e) {
                \Log::error("Broadcasting failed in vesselDeparture: " . $e->getMessage());
            }

            \DB::commit();
            return response()->json(['message' => 'Vessel has successfully departed']);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json(['message' => 'Departure execution failed', 'error' => $e->getMessage()], 500);
        }
    }

    public function getDashboardStats(Request $request)
    {
        $userId = $request->user()->id;

        $activeVessels = Vessel::where('owner_id', $userId)
            ->whereIn('status', ['approved', 'scheduled', 'docked', 'loading', 'unloading', 'ready'])
            ->count();

        $pendingAnchorage = AnchorageRequest::where('agent_id', $userId)
            ->where('status', 'pending')
            ->count();

        // For now, completed operations can be approved manifests or completed anchorage requests
        $completed = AnchorageRequest::where('agent_id', $userId)
            ->where('status', 'completed')
            ->count();

        return response()->json([
            'activeVessels' => $activeVessels,
            'pendingClearances' => $pendingAnchorage,
            'completedOperations' => $completed,
            'notifications' => 0, // Placeholder for alerts/notifications
        ]);
    }

    public function getTrackerData(Request $request)
    {
        $userId = $request->user()->id;

        // 1. Arrivals (Vessels)
        $arrivals = Vessel::where('owner_id', $userId)->get()->map(function ($v) use ($request) {
            $isDraft = $v->status === 'draft';
            $isAwaiting = $v->status === 'awaiting';
            $isRejected = $v->status === 'rejected';
            $isApproved = !in_array($v->status, ['draft', 'awaiting', 'rejected']);

            return [
                'id' => 'AN-' . $v->id,
                'type' => 'arrival',
                'vessel' => $v->name,
                'title' => 'Arrival Notification',
                'submittedDate' => $v->created_at->toDateTimeString(),
                'status' => $isAwaiting ? 'pending' : ($v->status === 'active' || $v->status === 'approved' ? 'approved' : $v->status),
                'completedDate' => $v->updated_at->toDateTimeString(),
                'rejectionReason' => $v->rejection_reason ?? null,
                'timeline' => [
                    ['step' => 'Submitted', 'date' => $v->created_at->toDateTimeString(), 'user' => 'Agent', 'status' => !$isDraft ? 'completed' : 'pending'],
                    ['step' => 'Under Review', 'date' => '', 'user' => 'Port Officer', 'status' => $isAwaiting ? 'pending' : ($isApproved ? 'completed' : ($isRejected ? 'rejected' : 'pending'))],
                    ['step' => 'Approved', 'date' => $isApproved ? $v->updated_at->toDateTimeString() : '', 'user' => 'Port Officer', 'status' => $isApproved ? 'completed' : ($isRejected ? 'rejected' : 'pending')],
                ]
            ];
        });

        // 2. Anchorage Requests
        $anchorage = AnchorageRequest::with(['vessel', 'wharf'])->where('agent_id', $userId)->get()->map(function ($a) {
            $statusMapping = [
                'pending' => 'pending',
                'wharf_assigned' => 'approved',
                'waiting' => 'pending', // Waitlisted is still pending assignment
                'approved' => 'approved',
                'rejected' => 'rejected',
                'completed' => 'completed',
            ];

            return [
            'id' => 'AR-' . $a->id,
            'type' => 'anchorage',
            'vessel' => $a->vessel->name,
            'title' => 'Anchorage Request',
            'submittedDate' => $a->created_at->toDateTimeString(),
            'status' => $statusMapping[$a->status] ?? $a->status,
            'completedDate' => $a->wharf_assigned_at ? $a->wharf_assigned_at->toDateTimeString() : $a->updated_at->toDateTimeString(),
            'rejectionReason' => $a->rejection_reason ?? null,
            'timeline' => [
            ['step' => 'Submitted', 'date' => $a->created_at->toDateTimeString(), 'user' => 'Agent', 'status' => 'completed'],
            ['step' => 'Wharf Review', 'date' => $a->status !== 'pending' ? $a->updated_at->toDateTimeString() : '', 'user' => 'Wharf Officer', 'status' => $a->status === 'pending' ? 'pending' : 'completed'],
            ['step' => 'Slot Allocation', 'date' => $a->wharf_assigned_at ? $a->wharf_assigned_at->toDateTimeString() : '', 'user' => 'Wharf Officer', 'status' => $a->status === 'wharf_assigned' ? 'completed' : ($a->status === 'waiting' ? 'pending' : 'pending')],
            ]
            ];
        });

        // 3. Manifests
        $manifests = CargoManifest::where('uploaded_by', $userId)->with('vessel')->get()->map(function ($m) {
            return [
            'id' => 'CM-' . $m->id,
            'type' => 'manifest',
            'vessel' => $m->vessel->name,
            'title' => 'Cargo Manifest',
            'submittedDate' => $m->created_at->toDateTimeString(),
            'status' => $m->status,
            'completedDate' => $m->updated_at->toDateTimeString(),
            'timeline' => [
            ['step' => 'Uploaded', 'date' => $m->created_at->toDateTimeString(), 'user' => 'Agent', 'status' => 'completed'],
            ['step' => 'Under Review', 'date' => '', 'user' => 'Port Officer', 'status' => $m->status === 'pending' ? 'pending' : 'completed'],
            ['step' => 'Approved', 'date' => $m->status === 'approved' ? $m->updated_at->toDateTimeString() : '', 'user' => 'Port Officer', 'status' => $m->status === 'approved' ? 'completed' : 'pending'],
            ]
            ];
        });

        // 4. Port Clearance Requests & Certificates
        $vesselIds = Vessel::where('owner_id', $userId)->pluck('id');
        $clearances = PortClearance::whereIn('vessel_id', $vesselIds)
            ->with('vessel')
            ->get()
            ->map(function ($c) {
                $statusMap = [
                    'pending_clearance'  => 'pending',
                    'valid'              => 'approved',
                    'clearance_approved' => 'approved',
                    'rejected'           => 'rejected',
                ];
                $normalizedStatus = $statusMap[$c->status] ?? $c->status;
                $isApproved = in_array($c->status, ['valid', 'clearance_approved']);
                $isRejected = $c->status === 'rejected';

                return [
                    'id'              => 'PC-' . $c->id,
                    'type'            => 'clearance',
                    'vessel'          => $c->vessel->name,
                    'title'           => $isApproved ? 'Port Clearance Certificate' : 'Port Clearance Request',
                    'submittedDate'   => $c->created_at->toDateTimeString(),
                    'status'          => $normalizedStatus,
                    'completedDate'   => $isApproved ? $c->updated_at->toDateTimeString() : null,
                    'rejectionReason' => $c->rejection_reason,
                    'timeline'        => [
                        ['step' => 'Submitted',    'date' => $c->created_at->toDateTimeString(),                                            'user' => 'Agent',        'status' => 'completed'],
                        ['step' => 'Under Review', 'date' => ($isApproved || $isRejected) ? $c->updated_at->toDateTimeString() : '',       'user' => 'Port Officer', 'status' => ($isApproved || $isRejected) ? 'completed' : 'pending'],
                        ['step' => $isRejected ? 'Rejected' : 'Approved', 'date' => $isApproved ? ($c->issue_date ? $c->issue_date->toDateTimeString() : '') : ($isRejected ? $c->updated_at->toDateTimeString() : ''), 'user' => 'Port Officer', 'status' => $isApproved ? 'completed' : ($isRejected ? 'rejected' : 'pending')],
                    ],
                ];
            });

        // Merge and sort
        $all = $arrivals->concat($anchorage)->concat($manifests)->concat($clearances)->sortByDesc('submittedDate')->values();

        return response()->json($all);
    }

    private function notifyUsers(array $roles, string $title, string $message, array $data = [])
    {
        $users = User::role($roles)->get();
        foreach ($users as $user) {
            Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'type' => $data['type'] ?? null,
                'data' => isset($data['data']) ? json_encode($data['data']) : null,
            ]);
        }
    }

    public function updateArrival(Request $request, $id)
    {
        $vessel = Vessel::where('id', $id)->where('owner_id', $request->user()->id)->firstOrFail();
        
        $request->validate([
            'eta' => 'required|date',
            'type' => 'nullable|string',
            'expected_containers' => 'nullable|integer|min:1|required_if:type,container',
            'flag' => 'nullable|string|regex:/^[\x20-\x7E\n\r]*$/',
            'name' => 'nullable|string|regex:/^[\x20-\x7E\n\r]*$/',
            'imo_number' => 'nullable|string',
            'purpose' => 'nullable|string|regex:/^[\x20-\x7E\n\r]*$/',
            'cargo' => 'nullable|string|regex:/^[\x20-\x7E\n\r]*$/',
            'priority' => 'nullable|string|in:Low,Medium,High',
            'priority_reason' => 'nullable|required_if:priority,Medium|string|min:20|regex:/^[\x20-\x7E\n\r]*$/',
            'priority_document' => 'nullable|required_if:priority,High|file|mimes:pdf,jpeg,jpg|max:10240',
        ], [
            'name.regex' => 'The vessel name must only contain English characters.',
            'flag.regex' => 'The flag must only contain English characters.',
            'purpose.regex' => 'The purpose must only contain English characters.',
            'cargo.regex' => 'The cargo must only contain English characters.',
            'priority_reason.regex' => 'The priority reason must only contain English characters.',
        ]);

        $data = $request->only(['eta', 'type', 'expected_containers', 'flag', 'name', 'imo_number', 'purpose', 'cargo', 'priority', 'priority_reason']);
        if ($request->hasFile('priority_document')) {
            $data['priority_document_path'] = $request->file('priority_document')->store('priority_documents', 'public');
        }

        $vessel->update($data);

        $this->notifyUsers(['officer', 'executive'], 'Arrival Updated', "Agent has updated arrival details for vessel {$vessel->name}.", [
            'type' => 'arrival_updated',
            'data' => ['name' => $vessel->name]
        ]);

        return response()->json($vessel);
    }

    public function deleteArrival(Request $request, $id)
    {
        $vessel = Vessel::where('id', $id)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();

        // Check and silently delete any associated pending anchorage requests
        $pendingAnchorage = AnchorageRequest::where('vessel_id', $vessel->id)
            ->whereIn('status', ['pending', 'wharf_assigned', 'waiting'])
            ->get();
            
        foreach ($pendingAnchorage as $anchorage) {
            $anchorage->delete();
        }

        // Soft delete the vessel by marking it archived
        if ($vessel->current_wharf_id) {
            \App\Models\Wharf::where('id', $vessel->current_wharf_id)->update(['status' => 'available']);
            $vessel->current_wharf_id = null;
        }
        $vessel->status = 'archived';
        $vessel->save();

        return response()->json(['message' => 'Vessel has been removed from active view.']);
    }

    public function updateManifest(Request $request, $id)
    {
        $manifest = CargoManifest::where('id', $id)->where('uploaded_by', $request->user()->id)->firstOrFail();

        $request->validate([
            'total_weight' => 'required|numeric',
            'container_count' => 'required|integer',
            'file' => 'nullable|file',
        ]);

        $data = [
            'total_weight' => $request->total_weight,
            'container_count' => $request->container_count,
        ];

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('manifests');
        }

        $manifest->update($data);

        $this->notifyUsers(['officer'], 'Manifest Updated', "Agent has updated cargo manifest for vessel {$manifest->vessel->name}.", [
            'type' => 'manifest_updated',
            'data' => ['name' => $manifest->vessel->name]
        ]);

        return response()->json($manifest);
    }

    public function updateAnchorageRequest(Request $request, $id)
    {
        $anchorage = AnchorageRequest::where('id', $id)->where('agent_id', $request->user()->id)->firstOrFail();

        $request->validate([
            'duration' => 'required|integer',
            'reason' => 'required|string',
            'docking_time' => 'required|date',
        ]);

        $anchorage->update([
            'duration' => $request->duration,
            'reason' => $request->reason,
            'docking_time' => $request->docking_time,
        ]);

        $this->notifyUsers(['executive'], 'Anchorage Request Updated', "Agent has updated anchorage request for vessel {$anchorage->vessel->name}.", [
            'type' => 'anchorage_updated',
            'data' => ['name' => $anchorage->vessel->name]
        ]);

        return response()->json($anchorage);
    }

    public function updateClearance(Request $request, $id)
    {
        // For agent, owner check via vessels:
        $vessels = Vessel::where('owner_id', $request->user()->id)->pluck('id');
        $clearance = PortClearance::where('id', $id)->whereIn('vessel_id', $vessels)->firstOrFail();

        $request->validate([
            'next_port' => 'required|string',
        ]);

        $clearance->update([
            'next_port' => $request->next_port,
        ]);

        $this->notifyUsers(['officer'], 'Clearance Updated', "Agent has updated port clearance request for vessel {$clearance->vessel->name}.", [
            'type' => 'clearance_updated',
            'data' => ['name' => $clearance->vessel->name]
        ]);

        return response()->json($clearance);
    }

    public function finalizeArrival(Request $request, $id)
    {
        $vessel = Vessel::where('id', $id)
            ->where('owner_id', $request->user()->id)
            ->with('containers')
            ->firstOrFail();

        if ($vessel->status !== 'draft') {
            return response()->json([
                'message' => 'This arrival notification has already been submitted or is in a different state.',
                'status' => $vessel->status
            ], 422);
        }

        $containers = $vessel->containers;

        // 1. Ensure at least one manifest exists
        if ($containers->isEmpty()) {
            return response()->json([
                'message' => 'Cannot finalize: At least one cargo manifest must be uploaded.',
                'error_code' => 'NO_MANIFESTS'
            ], 422);
        }

        // 1.5. If expected_containers is set, ensure it matches the actual count
        if ($vessel->expected_containers && $vessel->expected_containers > 0) {
            $manifestCount = $containers->count();
            if ($manifestCount !== $vessel->expected_containers) {
                return response()->json([
                    'message' => "Cannot finalize: Expected {$vessel->expected_containers} containers, but {$manifestCount} manifests were uploaded.",
                    'error_code' => 'MANIFEST_COUNT_MISMATCH'
                ], 422);
            }
        }

        // 2. Check for OCR extraction errors
        $failedManifests = $containers->filter(function($c) {
            return in_array($c->extraction_status, ['failed', 'incomplete']);
        });

        if ($failedManifests->isNotEmpty()) {
            return response()->json([
                'message' => 'Cannot finalize: One or more manifests have OCR extraction errors. Please resolve them first.',
                'failed_ids' => $failedManifests->pluck('id'),
                'error_code' => 'OCR_VALIDATION_FAILED'
            ], 422);
        }

        // 3. Finalize
        $vessel->status = 'awaiting';
        $vessel->save();

        // Dispatch events now that it's officially submitted
        \App\Events\VesselArrived::dispatch($vessel);
        $this->notifyUsers(['officer', 'executive'], 'New Arrival Notification', "A new arrival notification for {$vessel->name} has been submitted and is ready for review.", [
            'type' => 'vessel_awaiting_approval',
            'data' => ['name' => $vessel->name]
        ]);

        return response()->json([
            'message' => 'Arrival notification successfully finalized and submitted for review.',
            'vessel' => $vessel
        ]);
    }

    public function deleteManifest(Request $request, $id)
    {
        $container = \App\Models\Container::findOrFail($id);
        
        // Ensure authorization: manifest belongs to a vessel owned by this agent
        $vessel = Vessel::where('id', $container->vessel_id)
            ->where('owner_id', $request->user()->id)
            ->first();

        if (!$vessel) {
            return response()->json(['message' => 'Unauthorized or manifest not found.'], 403);
        }

        // Delete the physical file if it exists
        if ($container->manifest_file_path && Storage::disk('public')->exists($container->manifest_file_path)) {
            Storage::disk('public')->delete($container->manifest_file_path);
        }

        $container->delete();

        return response()->json(null, 204);
    }

    public function getVesselActivityReport(Request $request)
    {
        $vesselId = $request->get('vessel_id');
        $date = $request->get('date');
        $user = $request->user();

        // Enforce export mode: if vessel ID is provided, ignore the date filter
        if ($vesselId) {
            $date = null;
        }

        if (!$vesselId && !$date) {
            return response()->json(['message' => 'Either Vessel or Date is required.'], 400);
        }

        if ($vesselId) {
            // ── Export / historical-access mode ──────────────────────────────────
            // When fetching by vessel_id (document export), we deliberately do NOT
            // filter on status. A vessel that has 'departed' or is 'archived' must
            // still expose its Anchorage Request and Port Clearance records as
            // permanent historical documents. Restricting by status here would make
            // those documents unreachable after the departure lifecycle step.
            $vessels = Vessel::where('owner_id', $user->id)
                ->where('id', $vesselId)
                ->get();
        } else {
            // ── Date-filtered report mode ─────────────────────────────────────────
            // Only active / non-archived vessels relevant to the requested date.
            $vessels = Vessel::where('owner_id', $user->id)
                ->where('status', '!=', 'archived')
                ->where(function($q) use ($date) {
                    $q->whereDate('eta', $date)
                      ->orWhereHas('clearances', function($cq) use ($date) {
                          $cq->whereDate('created_at', $date)->orWhereDate('issue_date', $date);
                      })
                      ->orWhereHas('manifests', function($mq) use ($date) {
                          $mq->whereDate('created_at', $date);
                      });
                })->get();
        }

        $reports = $vessels->map(function($v) use ($date) {
            // 1. Arrival (The vessel record itself)
            // If date is provided, we only show it as a match if it's relevant to that date
            $arrival = $v;
            
            // ── 2. Anchorage ─────────────────────────────────────────────────────
            // Queried strictly by vessel_id FK — no status filter.
            // when($date) only activates in date-report mode; in export mode ($date is
            // null) it is skipped and the latest record is returned unconditionally.
            $anchorage = \App\Models\AnchorageRequest::where('vessel_id', $v->id)
                ->with('wharf')
                ->when($date, function($q) use ($date) {
                    return $q->whereDate('created_at', $date)->orWhereDate('docking_time', $date);
                })
                ->latest()
                ->first();

            // ── 3. Clearance ─────────────────────────────────────────────────────
            // Same pattern: FK-only lookup, date filter applied only when requested.
            $clearance = $v->clearances()
                ->with('officer')
                ->when($date, function($q) use ($date) {
                    return $q->whereDate('created_at', $date)->orWhereDate('issue_date', $date);
                })
                ->latest()
                ->first();

            return [
                'vessel' => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'imo' => $v->imo_number
                ],
                'date' => $date ?: now()->format('Y-m-d'),
                'arrival' => $arrival,
                'anchorage' => $anchorage,
                'clearance' => $clearance
            ];
        });

        // If a specific vessel was requested, return it directly (backward compatibility with frontend)
        if ($vesselId && $reports->isNotEmpty()) {
            return response()->json($reports->first());
        }

        return response()->json($reports);
    }

    public function emergencyExit(Request $request, $id)
    {
        $request->validate([
            'exit_reason' => 'required|string',
        ]);

        $vessel = Vessel::where('id', $id)
            ->where('owner_id', $request->user()->id)
            ->first();

        if (!$vessel) {
            return response()->json(['message' => 'Vessel not found or unauthorized access.'], 404);
        }

        // Guard: vessel must be in pre-anchorage state
        if (!in_array($vessel->status, ['awaiting', 'approved', 'draft', 'rejected'])) {
            return response()->json([
                'message' => "Vessel cannot be withdrawn in its current state ({$vessel->status}).",
                'error_code' => 'INVALID_STATUS',
            ], 422);
        }

        // Guard: no anchorage request must exist for this vessel
        $hasAnchorageRequest = AnchorageRequest::where('vessel_id', $vessel->id)->exists();
        if ($hasAnchorageRequest) {
            return response()->json([
                'message' => 'Cannot withdraw vessel — anchorage process has already been initiated. The vessel must go through the standard port clearance process.',
                'error_code' => 'ANCHORAGE_EXISTS',
            ], 422);
        }

        \DB::beginTransaction();
        try {
            $vessel->update([
                'status' => 'emergency_departed',
                'exit_reason' => $request->exit_reason,
                'emergency_departed_at' => now(),
            ]);

            // Create a log entry
            $log = Log::create([
                'user_id' => $request->user()->id,
                'vessel_id' => $vessel->id,
                'vessel_name' => $vessel->name,
                'action' => 'emergency_exit',
                'details' => "Vessel {$vessel->name} has been withdrawn (emergency exit). Reason: {$request->exit_reason}",
            ]);

            // Attempt event broadcasting and notifications, but don't fail the whole transaction if they fail
            try {
                event(new \App\Events\VesselOperationLogged($log, $request->user()->name));
                
                $this->notifyUsers(
                    ['executive'],
                    'Emergency Vessel Exit',
                    "Vessel {$vessel->name} (IMO: {$vessel->imo_number}) has been withdrawn by agent {$request->user()->name}. Reason: {$request->exit_reason}",
                    [
                        'type' => 'emergency_exit',
                        'data' => [
                            'vessel' => $vessel->name,
                            'agent' => $request->user()->name,
                            'reason' => $request->exit_reason
                        ]
                    ]
                );
            } catch (\Exception $e) {
                \Log::error("Post-exit actions failed: " . $e->getMessage());
            }

            \DB::commit();
            return response()->json([
                'message' => 'Vessel has been successfully withdrawn.',
                'vessel' => $vessel->fresh(),
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'message' => 'Emergency exit failed: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    public function expandDuration(Request $request, $id)
    {
        $request->validate([
            'additional_hours' => 'required|integer|min:1',
        ]);

        $anchorage = AnchorageRequest::where('id', $id)
            ->where('agent_id', $request->user()->id)
            ->firstOrFail();

        $anchorage->update([
            'duration_hours' => $anchorage->duration_hours + $request->additional_hours,
            'duration' => (string)($anchorage->duration_hours + $request->additional_hours),
            'anchorage_started_at' => now(), // Reset timer so countdown restarts from expansion time
            'timeout_notified_at' => null,   // Clear notification status upon expansion
        ]);

        // Create log entry
        Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $anchorage->vessel_id,
            'vessel_name' => $anchorage->vessel->name,
            'action' => 'duration_expanded',
            'details' => "Agent expanded anchorage duration by {$request->additional_hours} hours. New total: {$anchorage->duration_hours} hours.",
            'ip_address' => $request->ip()
        ]);

        return response()->json(['success' => true, 'anchorage' => $anchorage]);
    }
}
