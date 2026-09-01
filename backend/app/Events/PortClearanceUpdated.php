<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\PortClearance;

class PortClearanceUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $payload;
    private int $agentId;

    public function __construct(PortClearance $clearance, int $agentId)
    {
        $this->agentId = $agentId;

        $clearance->loadMissing('vessel');

        // Map clearance status to normalized timeline status
        $statusMap = [
            'pending_clearance'  => 'pending',
            'valid'              => 'approved',
            'clearance_approved' => 'approved',
            'rejected'           => 'rejected',
        ];

        $normalizedStatus = $statusMap[$clearance->status] ?? $clearance->status;
        $isApproved = in_array($clearance->status, ['valid', 'clearance_approved']);
        $isRejected = $clearance->status === 'rejected';

        $this->payload = [
            'id'              => 'PC-' . $clearance->id,
            'type'            => 'clearance',
            'vessel'          => $clearance->vessel->name ?? 'Unknown',
            'title'           => $isApproved ? 'Port Clearance Certificate' : 'Port Clearance Request',
            'submittedDate'   => $clearance->created_at->toDateTimeString(),
            'status'          => $normalizedStatus,
            'completedDate'   => $isApproved ? $clearance->updated_at->toDateTimeString() : null,
            'rejectionReason' => $clearance->rejection_reason,
            'timeline'        => [
                ['step' => 'Submitted',    'date' => $clearance->created_at->toDateTimeString(),                                            'user' => 'Agent',        'status' => 'completed'],
                ['step' => 'Under Review', 'date' => ($isApproved || $isRejected) ? $clearance->updated_at->toDateTimeString() : '',       'user' => 'Port Officer', 'status' => ($isApproved || $isRejected) ? 'completed' : 'pending'],
                ['step' => $isRejected ? 'Rejected' : 'Approved', 'date' => $isApproved ? $clearance->issue_date->toDateTimeString() : ($isRejected ? $clearance->updated_at->toDateTimeString() : ''), 'user' => 'Port Officer', 'status' => $isApproved ? 'completed' : ($isRejected ? 'rejected' : 'pending')],
            ],
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->agentId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'port-clearance.updated';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
