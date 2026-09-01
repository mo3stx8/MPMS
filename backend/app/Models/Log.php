<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Vessel;

class Log extends Model
{
    protected $fillable = [
        'user_id',
        'vessel_id',
        'vessel_name',
        'action',
        'details',
        'ip_address',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }
}
