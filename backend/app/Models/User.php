<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;


use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, HasApiTokens, SoftDeletes;
    
    const STATUS_PENDING   = 'pending';
    const STATUS_ACTIVE    = 'active';
    const STATUS_REJECTED  = 'rejected';
    const STATUS_SUSPENDED = 'suspended';


    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'organization',
        'status',
        'rejection_reason',
        'verified',
        'phone',
        'signature',
        'avatar_url',
        'theme',
        'language',
    ];

    /**
     * The attributes that should be appended to the model's array form.
     *
     * @var array
     */
    protected $appends = ['signature_base64', 'role'];

    /**
     * Get the signature as a base64 data URL.
     *
     * @return string|null
     */
    public function getSignatureBase64Attribute()
    {
        if (!$this->signature) {
            return null;
        }

        // Convert storage URL to internal path
        // e.g., /storage/signatures/xyz.png -> signatures/xyz.png
        $path = str_replace('/storage/', '', $this->signature);
        
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
            $content = \Illuminate\Support\Facades\Storage::disk('public')->get($path);
            $mime = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($path);
            return 'data:' . $mime . ';base64,' . base64_encode($content);
        }

        return null;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'verified' => 'boolean',
        ];
    }


    /**
     * Get the user's primary role for backward compatibility.
     *
     * @return string|null
     */
    public function getRoleAttribute()
    {
        return $this->roles->first()->name ?? null;
    }
}

