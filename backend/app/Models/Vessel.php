<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vessel extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'imo_number',
        'type',
        'expected_containers',
        'flag',
        'owner_id',
        'status',
        'eta',
        'etd',
        'current_wharf_id',
        'purpose',
        'cargo',
        'priority',
        'priority_reason',
        'priority_document_path',
        'rejection_reason',
        'exit_reason',
        'emergency_departed_at',
    ];

    protected $casts = [
        'eta' => 'datetime',
        'etd' => 'datetime',
        'emergency_departed_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class , 'owner_id');
    }

    public function wharf()
    {
        return $this->belongsTo(Wharf::class , 'current_wharf_id');
    }

    public function manifests()
    {
        return $this->hasMany(CargoManifest::class);
    }

    public function clearances()
    {
        return $this->hasMany(PortClearance::class);
    }

    public function containers()
    {
        return $this->hasMany(Container::class);
    }
}
