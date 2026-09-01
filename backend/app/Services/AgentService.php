<?php

namespace App\Services;

use App\Models\Vessel;
use App\Models\AnchorageRequest;
use Illuminate\Http\Request;

class AgentService
{
    /**
     * Handle ship arrival notification logic.
     */
    public function processArrival(array $data, $userId)
    {
        return Vessel::create([
            'imo_number' => $data['imo_number'],
            'name' => $data['name'],
            'type' => $data['type'],
            'expected_containers' => $data['expected_containers'] ?? null,
            'flag' => $data['flag'] ?? 'Unknown',
            'owner_id' => $userId,
            'eta' => $data['eta'],
            'status' => 'draft',
            'purpose' => $data['purpose'] ?? 'Cargo Handling',
            'cargo' => $data['cargo'] ?? null,
            'priority' => $data['priority'] ?? 'Low',
            'priority_reason' => $data['priority_reason'] ?? null,
            'priority_document_path' => $data['priority_document_path'] ?? null,
        ]);
    }

    /**
     * Handle anchorage/docking request logic.
     */
    public function processAnchorageRequest(array $data, $userId)
    {
        return AnchorageRequest::create([
            'vessel_id' => $data['vessel_id'],
            'agent_id' => $userId,
            'duration' => $data['duration'],
            'reason' => $data['reason'],
            'docking_time' => $data['docking_time'],
            'status' => 'pending',
        ]);
    }
}
