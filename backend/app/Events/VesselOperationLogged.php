<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Log;

class VesselOperationLogged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $payload;

    /**
     * Build a standardized timeline payload from a Log record.
     */
    public function __construct(Log $log, string $actorName = 'System')
    {
        // Map action strings to human-readable event types
        $typeMap = [
            'approve_arrival'   => 'Arrival Approved',
            'reject_arrival'    => 'Arrival Rejected',
            'assign_berth'      => 'Wharfage Assignment',
            'release_berth'     => 'Berth Released',
            'issue_clearance'   => 'Port Clearance Issued',
            'approve_clearance' => 'Clearance Approved',
            'reject_clearance'  => 'Clearance Rejected',
            'approve_anchorage' => 'Anchorage Approved',
            'reject_anchorage'  => 'Anchorage Rejected',
            'submit_arrival'    => 'Arrival Registration',
            'upload_manifest'   => 'Cargo Manifest Upload',
            'execute_departure' => 'Vessel Departed',
            'approve_user'      => 'User Approved',
            'reject_user'       => 'User Rejected',
        ];

        $type = $typeMap[$log->action] ?? ucwords(str_replace('_', ' ', $log->action));

        // Derive status from the action verb
        $status = 'completed';
        if (str_contains($log->action, 'reject')) {
            $status = 'rejected';
        } elseif (str_contains($log->action, 'submit')) {
            $status = 'pending';
        } elseif (str_contains($log->action, 'approve')) {
            $status = 'approved';
        }

        $this->payload = [
            'id'        => 'EVT-' . $log->id,
            'vessel_id' => $log->vessel_id,
            'type'      => $type,
            'status'    => $status,
            'details'   => $log->details,
            'actor'     => $actorName,
            'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Broadcast on the public port-operations channel.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('port-operations'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'vessel.operation.logged';
    }

    /**
     * Data sent to the client.
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
