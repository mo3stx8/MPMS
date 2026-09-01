<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AnchorageRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'vessel_id',
        'agent_id',
        'status',
        'docking_time',
        'duration',
        'location',
        'reason',
        'rejection_reason',
        'wharf_id',
        'wharf_assigned_at',
        'anchorage_started_at',
        'duration_hours',
        'timeout_notified_at',
    ];

    protected $casts = [
        'docking_time' => 'datetime',
        'wharf_assigned_at' => 'datetime',
        'anchorage_started_at' => 'datetime',
        'timeout_notified_at' => 'datetime',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function wharf()
    {
        return $this->belongsTo(Wharf::class);
    }
}
