<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Container extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'vessel_id',
        'manifest_file_path',
        'port_of_loading',
        'arrival_date',
        'description_of_goods',
        'storage_type',
        'consignee_name',
        'consignee_phone',
        'trader_user_id',
        'status',
        'extraction_status',
        'extraction_errors',
        'error_reason',
        'storage_area_id',
    ];

    protected $casts = [
        'extraction_errors' => 'array',
    ];

    /**
     * The legacy terminology requested (maps to Vessel under the hood)
     */
    public function arrivalNotification()
    {
        return $this->belongsTo(Vessel::class, 'vessel_id');
    }

    /**
     * Standard relationship to Vessel
     */
    public function vessel()
    {
        return $this->belongsTo(Vessel::class, 'vessel_id');
    }

    /**
     * Optional mapped trader user
     */
    public function trader()
    {
        return $this->belongsTo(User::class, 'trader_user_id');
    }

    /**
     * Standard relationship to Discharge Requests natively
     */
    public function dischargeRequest()
    {
        return $this->hasOne(DischargeRequest::class);
    }

    /**
     * Optional mapped storage area
     */
    public function storageArea()
    {
        return $this->belongsTo(StorageArea::class);
    }
}
