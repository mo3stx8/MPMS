<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Wharf;
use App\Models\Container;
use App\Models\StorageArea;
use App\Models\AnchorageRequest;
use App\Models\Notification;
use App\Models\User;
use App\Models\Log;
use App\Models\Vessel;

class WharfController extends Controller
{
    public function getStorageAreas()
    {
        $areas = StorageArea::all();
        return response()->json([
            'success' => true,
            'areas' => $areas
        ]);
    }

    public function getWharves()
    {
        return response()->json(Wharf::with('vessels.containers')->get());
    }

    public function updateWharfStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:available,occupied,maintenance',
        ]);

        $wharf = Wharf::findOrFail($id);
        
        if (in_array($request->status, ['available', 'maintenance'])) {
            Vessel::where('current_wharf_id', $wharf->id)->update(['current_wharf_id' => null]);
        }

        $wharf->status = $request->status;
        $wharf->save();

        return response()->json($wharf);
    }

    public function getContainers(Request $request)
    {
        // Only return containers for vessels that have an APPROVED/ASSIGNED anchorage request
        $anchoredVesselIds = AnchorageRequest::whereIn('status', ['approved', 'wharf_assigned', 'completed', 'left_wharf'])
            ->pluck('vessel_id');

        $containers = Container::whereIn('vessel_id', $anchoredVesselIds)
            ->with('arrivalNotification')
            ->get();
            
        return response()->json($containers);
    }

    public function getDashboardStats()
    {
        $anchoredVesselIds = AnchorageRequest::whereIn('status', ['approved', 'wharf_assigned', 'completed'])
            ->pluck('vessel_id');

        $usedCapacity = Container::where('status', 'discharged')->count();
        
        $pendingDischargeRequests = \App\Models\DischargeRequest::where('status', 'pending')
            ->distinct('batch_id')
            ->count('batch_id');

        return response()->json([
            'pending_availability' => AnchorageRequest::where('status', 'pending')->count(),
            'approved_wharves' => Wharf::where('status', 'available')->count(),
            'occupied_wharves' => Wharf::where('status', 'occupied')->count(),
            'storage_used' => $usedCapacity,
            'storage_available' => 4000,
            'containers_awaiting' => Container::where('status', 'arrived')->count(),
        ]);
     
      
    }

    public function getDischargeRequests()
    {
        $requests = \App\Models\DischargeRequest::with(['container', 'trader', 'vessel'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('batch_id')
            ->map(function ($group) {
                $first = $group->first();
                $wharfUser = $first->status === 'approved' ? User::role('wharf')->first() : null;
                return [
                    'batch_id' => $first->batch_id,
                    'vessel' => $first->vessel,
                    'trader' => $first->trader,
                    'status' => $first->status,
                    'requested_date' => $first->requested_date,
                    'rejection_reason' => $first->rejection_reason,
                    'notes' => $first->notes,
                    'containers' => $group->pluck('container'),
                    'created_at' => $first->created_at,
                    'wharf_signature_base64' => $wharfUser ? $wharfUser->signature_base64 : null,
                    'wharf_officer_name'     => $wharfUser ? $wharfUser->name : null,
                ];
            })->values();

        return response()->json($requests);
    }

    public function approveDischargeRequest($batchId)
    {
        $requests = \App\Models\DischargeRequest::where('batch_id', $batchId)->get();
        if ($requests->isEmpty()) {
            return response()->json(['message' => 'Batch not found'], 404);
        }

        foreach ($requests as $req) {
            $req->update(['status' => 'approved']);
            if ($req->container) {
                // 'cleared' is the final valid status for a container after discharge
                $req->container->update(['status' => 'cleared']);
            }
        }

        $firstReq = $requests->first();
        if ($firstReq && $firstReq->trader_id) {
            $vesselName = $firstReq->vessel ? $firstReq->vessel->name : 'your vessel';
            Notification::create([
                'user_id' => $firstReq->trader_id,
                'title' => 'Discharge Approved',
                'message' => "Your Containers from {$vesselName} have been discharged successfully.",
                'type' => 'discharge_approved',
                'data' => json_encode(['vessel' => $vesselName]),
            ]);
        }

        return response()->json(['message' => 'Discharge request approved and containers discharged.']);
    }

    public function declineDischargeRequest(Request $request, $batchId)
    {
        $request->validate([
            'reason' => 'required|string'
        ]);

        $requests = \App\Models\DischargeRequest::where('batch_id', $batchId)->get();
        if ($requests->isEmpty()) {
            return response()->json(['message' => 'Batch not found'], 404);
        }

        foreach ($requests as $req) {
            $req->update([
                'status' => 'declined',
                'rejection_reason' => $request->reason
            ]);
        }
        
        $firstReq = $requests->first();
        if ($firstReq && $firstReq->trader_id) {
            $vesselName = $firstReq->vessel ? $firstReq->vessel->name : 'your vessel';
            Notification::create([
                'user_id' => $firstReq->trader_id,
                'title' => 'Discharge Declined',
                'message' => "Your Discharge Request for {$vesselName} has been declined. Reason: {$request->reason}",
                'type' => 'discharge_declined',
                'data' => json_encode(['vessel' => $vesselName, 'reason' => $request->reason]),
            ]);
        }

        return response()->json(['message' => 'Discharge request declined.']);
    }

    public function assignContainer(Request $request)
    {
        $request->validate([
            'containerId' => 'required|exists:containers,id',
            'block' => 'required|string|max:10',
            'row' => 'required|integer',
            'tier' => 'required|integer',
        ]);

        $conflict = Container::where('block', $request->block)
            ->where('row', $request->row)
            ->where('tier', $request->tier)
            ->whereNotIn('status', ['discharged', 'cleared'])
            ->exists();

        if ($conflict) {
            return response()->json(['message' => 'This yard location is already occupied'], 400);
        }

        $container = Container::findOrFail($request->containerId);
        $container->status = 'assigned';
        $container->block = $request->block;
        $container->row = $request->row;
        $container->tier = $request->tier;
        $container->save();

        return response()->json(['success' => true, 'container' => $container]);
    }

    public function logContainerOperation(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:load,unload,discharge',
        ]);

        $container = Container::where('id', $id)->firstOrFail();
        if ($request->action === 'load')
            $container->status = 'loaded';
        if ($request->action === 'discharge')
            $container->status = 'discharged';
        $container->save();

        return response()->json(['success' => true, 'container' => $container]);
    }

    // ─── NEW: Anchorage Workflow ────────────────────────────────────────────────

    /**
     * Physical discharge of containers from vessel to wharf storage
     */
    public function dischargeContainers(Request $request, $id)
    {
        $request->validate([
            'container_ids' => 'required|array',
            'container_ids.*' => 'integer|exists:containers,id',
        ]);

        $vessel = Vessel::findOrFail($id);

        if (!$vessel->current_wharf_id) {
            return response()->json(['message' => 'Vessel is not currently assigned to a wharf'], 422);
        }

        // Update container statuses from 'pending' to 'discharged'
        Container::where('vessel_id', $vessel->id)
            ->whereIn('id', $request->container_ids)
            ->where('status', 'pending')
            ->update(['status' => 'discharged']);

        // Fetch updated containers to return
        $containers = Container::where('vessel_id', $vessel->id)->get();

        // Check if all containers have been discharged
        $pendingCount = Container::where('vessel_id', $vessel->id)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'message' => 'Containers successfully discharged to storage.',
            'containers' => $containers,
            'all_discharged' => $pendingCount === 0
        ]);
    }

    /**
     * Get all pending anchorage requests for the wharf worker to review.
     */
    public function getAnchorageRequests()
    {
        $requests = AnchorageRequest::with(['vessel.containers', 'wharf'])
            ->whereIn('status', ['pending', 'wharf_assigned', 'waiting', 'left_wharf', 'departed'])
            ->latest()
            ->get();

        $wharves = Wharf::with('vessels.containers')->get();

        return response()->json([
            'requests' => $requests,
            'wharves' => $wharves,
        ]);
    }

    /**
     * Option A: Assign and approve an anchorage request.
     * - Updates AnchorageRequest status -> wharf_assigned
     * - Marks the selected Wharf -> occupied
     */
    public function approveAnchorageRequest(Request $request, $id)
    {
        $request->validate([
            'wharf_id' => 'required|exists:wharves,id',
        ]);

        $anchorage = AnchorageRequest::with('vessel')->findOrFail($id);
        $wharf = Wharf::findOrFail($request->wharf_id);

        if ($wharf->status !== 'available') {
            return response()->json(['message' => 'Selected wharf is not available'], 422);
        }

        // Update anchorage request
        $anchorage->update([
            'status' => 'wharf_assigned',
            'wharf_id' => $wharf->id,
            'wharf_assigned_at' => now(),
            'anchorage_started_at' => now(), // The timer officially starts when wharf is assigned (Occupied)
            'duration_hours' => (int)$anchorage->duration,
        ]);

        // Sync Vessel mapping
        if ($anchorage->vessel) {
            // Ensure no old vessels remain stuck on this wharf
            Vessel::where('current_wharf_id', $wharf->id)->update(['current_wharf_id' => null]);
            
            $anchorage->vessel->current_wharf_id = $wharf->id;
            $anchorage->vessel->save();
        }

        // Create log entry
        Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $anchorage->vessel_id,
            'vessel_name' => $anchorage->vessel->name,
            'action' => 'wharf_assigned',
            'details' => "Wharf {$wharf->name} assigned to vessel {$anchorage->vessel->name}. Timer started for {$anchorage->duration_hours} hours.",
            'ip_address' => $request->ip()
        ]);

        // Mark wharf as occupied
        $wharf->status = 'occupied';
        $wharf->save();

        // Notify the agent
        Notification::create([
            'user_id' => $anchorage->agent_id,
            'title' => 'Wharf Assigned',
            'message' => "Your anchorage request for vessel {$anchorage->vessel->name} has been approved. Wharf {$wharf->name} has been assigned for your docking time.",
            'type' => 'wharf_assigned',
            'data' => json_encode(['vessel' => $anchorage->vessel->name, 'wharf' => $wharf->name]),
        ]);

        return response()->json($anchorage->fresh(['vessel', 'wharf']));
    }

    /**
     * Option B: Waitlist the anchorage request due to zero capacity.
     * - Updates AnchorageRequest status -> waiting
     * - Notifies the agent
     */
    public function waitlistAnchorageRequest(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $anchorage = AnchorageRequest::with('vessel')->findOrFail($id);

        $anchorage->update([
            'status' => 'waiting',
            'rejection_reason' => $request->reason ?? 'No wharf capacity available at the requested docking time. Your vessel has been placed on the waitlist.',
        ]);

        // Notify the agent
        Notification::create([
            'user_id' => $anchorage->agent_id,
            'title' => 'Vessel on Waitlist',
            'message' => "Your anchorage request for vessel {$anchorage->vessel->name} could not be immediately processed. Your vessel has been placed on a waitlist and will be assigned a wharf slot as soon as one becomes available.",
            'type' => 'vessel_waitlisted',
            'data' => json_encode(['vessel' => $anchorage->vessel->name]),
        ]);

        return response()->json($anchorage->fresh(['vessel', 'wharf']));
    }

    /**
     * Trigger a high-priority timeout notification to the agent.
     */
    public function triggerTimeoutNotification(Request $request, $id)
    {
        $anchorage = AnchorageRequest::with('vessel')->findOrFail($id);

        if ($anchorage->status !== 'wharf_assigned') {
            return response()->json(['message' => 'Request is not in wharf_assigned status'], 422);
        }

        // Update notified timestamp
        $anchorage->update([
            'timeout_notified_at' => now(),
        ]);

        // Notify the agent with high priority
        Notification::create([
            'user_id' => $anchorage->agent_id,
            'title' => 'URGENT: Anchorage Timeout',
            'message' => "The specified anchorage duration for vessel {$anchorage->vessel->name} has expired. Please take action immediately (Expand Duration or Port Clearance).",
            'type' => 'anchorage_timeout',
            'data' => json_encode([
                'vessel' => $anchorage->vessel->name,
                'vessel_id' => $anchorage->vessel_id,
                'request_id' => $anchorage->id,
            ]),
        ]);

        // Create log entry
        Log::create([
            'user_id' => $request->user()->id,
            'vessel_id' => $anchorage->vessel_id,
            'vessel_name' => $anchorage->vessel->name,
            'action' => 'anchorage_timeout_triggered',
            'details' => "Manual timeout alert triggered for vessel {$anchorage->vessel->name}.",
            'ip_address' => $request->ip()
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Reclassify a container's storage type and optionally log a new keyword.
     */
    public function reclassifyContainer(Request $request, $id)
    {
        $request->validate([
            'new_storage_type' => 'required|in:chemical,frozen,dry',
            'new_keyword' => 'nullable|string|max:100',
        ]);

        $container = Container::findOrFail($id);
        
        // Update container storage type
        $container->storage_type = $request->new_storage_type;
        $container->save();

        // If a new keyword is provided, save it for future extractions
        if ($request->filled('new_keyword')) {
            $keyword = strtolower(trim($request->new_keyword));
            
            // Check if it exists already to prevent duplicates
            \App\Models\StorageKeyword::firstOrCreate(
                ['keyword' => $keyword],
                ['storage_type' => $request->new_storage_type]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Container reclassified successfully.',
            'container' => $container
        ]);
    }
}
