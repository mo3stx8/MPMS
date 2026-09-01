<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Container;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;

class DischargeRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'container_id',
        'trader_id',
        'status',
        'requested_date',
        'batch_id',
        'vessel_id',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'requested_date' => 'datetime',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function container()
    {
        return $this->belongsTo(Container::class);
    }

    public function trader()
    {
        return $this->belongsTo(User::class, 'trader_id');
    }
    //
}
