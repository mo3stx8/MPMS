<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:agent,trader',
            'signature' => 'nullable|string',
        ]);

        // Public self-registration is limited to external-facing roles (agent, trader).
        // Internal/authority roles (officer, wharf, executive) are only provisioned by
        // administrators to prevent privilege escalation via the public registration endpoint.
        if (!in_array($request->role, ['agent', 'trader'], true)) {
            return response()->json(['message' => 'This role cannot be self-registered.'], 422);
        }

        $signatureUrl = null;
        if ($request->signature) {
            $signatureUrl = $this->saveSignatureBase64($request->signature);
            if (!$signatureUrl) {
                return response()->json(['message' => 'Invalid signature format'], 422);
            }
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'status' => User::STATUS_PENDING,
            'verified' => false,
            'signature' => $signatureUrl,
        ]);

        $user->assignRole($request->role);

        return response()->json([
            'message' => 'Registration request submitted. Your account is under Executive Management review.',
            'user' => $user,
        ], 202);
    }

    private function saveSignatureBase64($base64Image)
    {
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
            $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
            $type = strtolower($type[1]);
            
            if (!in_array($type, ['png', 'jpg', 'jpeg', 'gif'])) {
                return null;
            }

            $image = base64_decode($base64Image);
            $fileName = 'signatures/' . uniqid() . '.' . $type;
            
            Storage::disk('public')->put($fileName, $image);
            return Storage::url($fileName);
        }
        return null;
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        // Only apply status checks to publicly-registered roles (trader, agent).
        // System-created accounts (executive, officer, wharf) always bypass this check.
        $publicRoles = ['trader', 'agent'];

        if ($user->hasAnyRole($publicRoles)) {
            if ($user->status === User::STATUS_PENDING) {
                return response()->json([
                    'status'  => 'pending',
                    'message' => 'Account is under Executive Management review.',
                ], 403);
            }

            if ($user->status === User::STATUS_REJECTED) {
                return response()->json([
                    'status'           => 'rejected',
                    'message'          => 'Account request rejected.',
                    'rejection_reason' => $user->rejection_reason,
                ], 403);
            }
        }

        // Two-factor authentication challenge for accounts with 2FA enabled.
        // Instead of issuing a token, return an encrypted one-time challenge that
        // must be completed with a valid TOTP/recovery code within 5 minutes.
        if (app(TwoFactorAuthService::class)->isEnabled($user)) {
            $challenge = app(\Illuminate\Contracts\Encryption\Encrypter::class)
                ->encrypt(json_encode([
                    'user_id' => $user->id,
                    'expires' => now()->addMinutes(5)->timestamp,
                ]));

            return response()->json([
                'status'       => 'two_factor_required',
                'message'      => 'Two-factor authentication required.',
                'user_id'      => $user->id,
                'two_factor_token' => $challenge,
            ], 200);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
        ]);

        $user->update($request->only('name', 'email', 'phone'));

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar_url) {
                // Convert URL back to path
                $oldPath = str_replace('/storage/', 'public/', $user->avatar_url);
                Storage::delete($oldPath);
            }

            $path = $request->file('avatar')->store('avatars', 'public');
            $url = Storage::url($path);

            $user->update(['avatar_url' => $url]);

            return response()->json([
                'message' => 'Avatar updated successfully',
                'avatar_url' => $url
            ]);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function updatePreferences(Request $request)
    {
        $request->validate([
            'theme' => 'nullable|string|in:light,dark',
            'language' => 'nullable|string|in:ar,en',
        ]);

        $user = $request->user();
        $user->update($request->only('theme', 'language'));

        return response()->json([
            'message' => 'Preferences updated successfully',
            'user' => $user
        ]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function getProfile(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'preferences' => [
                'theme' => $request->user()->theme,
                'language' => $request->user()->language,
            ]
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateSignature(Request $request)
    {
        $request->validate([
            'signature' => 'required|string',
        ]);

        $user = $request->user();
        
        $signatureUrl = $this->saveSignatureBase64($request->signature);
        
        if (!$signatureUrl) {
            return response()->json(['message' => 'Invalid signature format'], 422);
        }

        $user->signature = $signatureUrl;
        $user->save();

        return response()->json([
            'message' => 'Signature updated successfully',
            'signature' => $user->signature,
        ]);
    }
}
