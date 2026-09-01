<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PasswordResetRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PasswordResetController extends Controller
{
    // -------------------------------------------------------------------------
    // POST /password-reset/request
    // User requests a password reset
    // -------------------------------------------------------------------------
    public function requestReset(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'No account found with this email address.'], 404);
        }

        // Check if there is already a pending request to prevent spamming
        $existingRequest = PasswordResetRequest::where('user_id', $user->id)
                                                ->where('status', 'pending')
                                                ->first();
        
        if ($existingRequest) {
            return response()->json(['message' => 'You already have a pending password reset request. Please wait for management approval.'], 409);
        }

        PasswordResetRequest::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'pending'
        ]);

        return response()->json(['message' => 'Password reset request sent to management for approval.'], 201);
    }

    // -------------------------------------------------------------------------
    // POST /password-reset/verify
    // User verifies the 4-digit code
    // -------------------------------------------------------------------------
    public function verifyCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:4'
        ]);

        $resetRequest = PasswordResetRequest::where('verification_code', $request->code)
                                            ->where('status', 'approved')
                                            ->first();

        if (!$resetRequest) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 400);
        }

        return response()->json([
            'message' => 'Code verified successfully.',
            'reset_token' => $request->code // For simplicity, we'll use the code as the token to pass to the next step
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /password-reset/recreate
    // User sets a new password
    // -------------------------------------------------------------------------
    public function recreatePassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string|size:4',
            'password' => 'required|string|min:8|confirmed'
        ]);

        $resetRequest = PasswordResetRequest::where('verification_code', $request->token)
                                            ->where('status', 'approved')
                                            ->first();

        if (!$resetRequest) {
            return response()->json(['message' => 'Invalid or expired reset token.'], 400);
        }

        $user = User::find($resetRequest->user_id);
        
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        // Mark the request as completed and clear the code
        $resetRequest->status = 'completed';
        $resetRequest->verification_code = null;
        $resetRequest->save();

        // Optionally revoke existing tokens so they have to log in again
        $user->tokens()->delete();

        return response()->json(['message' => 'Password has been changed successfully.']);
    }
}
