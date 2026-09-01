<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\PortClearance;

class PortClearanceRequested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $payload;
    private int $agentId;

    public function __construct(PortClearance $clearance, int $agentId)
    {
        $this->agentId = $agentId;

        $clearance->loadMissing('vessel');

        $this->payload = [
            'id'            => 'PC-' . $clearance->id,
            'type'          => 'clearance',
            'vessel'        => $clearance->vessel->name ?? 'Unknown',
            'title'         => 'Port Clearance Request',
            'submittedDate' => $clearance->created_at->toDateTimeString(),
            'status'        => 'pending',
            'completedDate' => null,
            'rejectionReason' => null,
            'timeline'      => [
                ['step' => 'Submitted',    'date' => $clearance->created_at->toDateTimeString(), 'user' => 'Agent',        'status' => 'completed'],
                ['step' => 'Under Review', 'date' => '',                                        'user' => 'Port Officer', 'status' => 'pending'],
                ['step' => 'Approved',     'date' => '',                                        'user' => 'Port Officer', 'status' => 'pending'],
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
        return 'port-clearance.requested';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
