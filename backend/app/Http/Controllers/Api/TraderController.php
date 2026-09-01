<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Container;
use App\Models\DischargeRequest;

use Illuminate\Support\Facades\DB;
use App\Models\Notification;
use App\Models\User;
use App\Models\Vessel;

class TraderController extends Controller
{
    public function getContainers(Request $request)
    {
        $user = $request->user();
        $userName = strtolower(trim($user->name));
        
        $vessels = \App\Models\Vessel::whereIn(DB::raw('LOWER(status)'), [
                'anchored', 
                'wharf_assigned', 
                'wharf assigned', 
                'approved', 
                'scheduled', 
                'docked',
                'departed'
            ])
            ->whereHas('containers', function ($q) use ($userName) {
                $q->whereRaw('LOWER(TRIM(consignee_name)) = ?', [$userName]);
            })
            ->with(['wharf', 'containers' => function ($q) use ($userName) {
                $q->whereRaw('LOWER(TRIM(consignee_name)) = ?', [$userName])
                  ->orderBy('created_at', 'desc');
            }])
            ->orderBy('eta', 'desc')
            ->get();
            
        return response()->json($vessels);
    }

    public function requestDischarge(Request $request)
    {
        $request->validate([
            'vessel_id' => 'required|exists:vessels,id',
            'container_ids' => 'required|array|min:1',
            'container_ids.*' => 'exists:containers,id',
            'requested_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $batchId = uniqid('batch_');

        // Verify all containers belong to this trader
        $containers = Container::whereIn('id', $request->container_ids)
            ->where(function ($query) use ($request) {
                $query->where('trader_user_id', $request->user()->id)
                      ->orWhere('consignee_phone', $request->user()->phone);
            })
            ->get();

        if ($containers->count() !== count($request->container_ids)) {
            return response()->json(['message' => 'One or more selected containers do not belong to you or do not exist.'], 403);
        }

        $discharges = [];
        foreach ($containers as $container) {
            $discharges[] = DischargeRequest::create([
                'container_id' => $container->id,
                'vessel_id' => $request->vessel_id,
                'trader_id' => $request->user()->id,
                'status' => 'pending',
                'batch_id' => $batchId,
                'requested_date' => $request->requested_date,
                'notes' => $request->notes,
            ]);
        }

        $vessel = Vessel::find($request->vessel_id);
        $vesselName = $vessel ? $vessel->name : 'Unknown Vessel';
        
        // Notify all users with role 'wharf'
        $wharfUsers = User::role('wharf')->get();
        foreach ($wharfUsers as $wharfUser) {
            Notification::create([
                'user_id' => $wharfUser->id,
                'title' => 'New Discharge Request',
                'message' => "Trader {$request->user()->name} has requested discharge for " . count($discharges) . " container(s) from vessel {$vesselName}.",
                'type' => 'discharge_request_new',
                'data' => json_encode([
                    'vessel' => $vesselName,
                    'trader' => $request->user()->name,
                    'batch_id' => $batchId,
                    'count' => count($discharges)
                ]),
            ]);
        }

        return response()->json([
            'message' => 'Discharge requests created successfully',
            'batch_id' => $batchId,
            'count' => count($discharges)
        ], 201);
    }

    public function getDischargeRequests(Request $request)
    {
        $requests = DischargeRequest::where('trader_id', $request->user()->id)
            ->with(['container', 'vessel'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('batch_id')
            ->map(function ($group) {
                $first = $group->first();
                $wharfUser = $first->status === 'approved' ? User::role('wharf')->first() : null;
                return [
                    'batch_id'         => $first->batch_id,
                    'vessel'           => $first->vessel,
                    'status'           => $first->status,
                    'requested_date'   => $first->requested_date,
                    'rejection_reason' => $first->rejection_reason,
                    'notes'            => $first->notes,
                    'containers'       => $group->pluck('container')->filter()->values(),
                    'created_at'       => $first->created_at,
                    'wharf_signature_base64' => $wharfUser ? $wharfUser->signature_base64 : null,
                    'wharf_officer_name'     => $wharfUser ? $wharfUser->name : null,
                ];
            })
            ->values();

        return response()->json($requests);
    }

    public function getDashboardStats(Request $request)
    {
        $user = $request->user();
        // Calculate stats only for containers whose vessels are released
        $containers = Container::where(function ($query) use ($user) {
                $query->where('trader_user_id', $user->id)
                      ->orWhere('consignee_phone', $user->phone);
            })
            ->whereHas('vessel', function ($q) {
                $q->whereIn('status', ['ready', 'departed', 'cleared', 'completed']);
            })
            ->get();
        
        return response()->json([
            'arrived' => $containers->where('status', 'arrived')->count(),
            'stored' => $containers->where('status', 'assigned')->count(),
            'ready_for_discharge' => $containers->where('status', 'ready_discharge')->count(),
            'unread_notifications' => 5, // Mock for now
            'pending_discharges' => DischargeRequest::where('trader_id', $request->user()->id)->where('status', 'pending')->distinct('batch_id')->count('batch_id'),
            'status_change_alerts' => 2, // Mock for now
        ]);
    }
}
