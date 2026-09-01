<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

class PortClearance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'vessel_id',
        'officer_id',
        'issue_date',
        'expiry_date',
        'status',
        'next_port',
        'certificate_path',
        'rejection_reason',
        'is_archived',
        'departed_at',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'expiry_date' => 'datetime',
        'departed_at' => 'datetime',
        'is_archived' => 'boolean',
    ];

    /**
     * Scope: only return non-archived clearances for dashboard views.
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('is_archived', false);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function officer()
    {
        return $this->belongsTo(User::class, 'officer_id');
    }
}
