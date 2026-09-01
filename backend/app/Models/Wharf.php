<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Wharf extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'status',
    ];

    public function vessels()
    {
        return $this->hasMany(Vessel::class, 'current_wharf_id');
    }
}
