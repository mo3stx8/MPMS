<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CargoManifest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'vessel_id',
        'uploaded_by',
        'status',
        'rejection_reason',
        'file_path',
        'total_weight',
        'container_count',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function containers()
    {
        return $this->hasMany(Container::class, 'manifest_id');
    }
}
