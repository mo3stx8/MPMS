<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StorageArea extends Model
{
    /** @use HasFactory<\Database\Factories\StorageAreaFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'capacity',
        'used',
        'type',
        'status',
    ];

    public function containers()
    {
        return $this->hasMany(Container::class);
    }
}
