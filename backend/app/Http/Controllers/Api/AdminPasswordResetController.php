<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use Illuminate\Http\Request;

class AdminPasswordResetController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /admin/password-resets
    // Fetch pending password reset requests
    // -------------------------------------------------------------------------
    public function index()
    {
        $requests = PasswordResetRequest::with('user:id,name,email')
                                        ->where('status', 'pending')
                                        ->orderBy('created_at', 'asc')
                                        ->get();

        return response()->json($requests);
    }

    // -------------------------------------------------------------------------
    // POST /admin/password-resets/{id}/approve
    // Executive approves the request and generates a 4-digit code
    // -------------------------------------------------------------------------
    public function approve($id)
    {
        $resetRequest = PasswordResetRequest::with('user')->findOrFail($id);

        if ($resetRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is not pending.'], 400);
        }

        // Generate a random 4-digit code
        $code = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);

        $resetRequest->status = 'approved';
        $resetRequest->verification_code = $code;
        $resetRequest->save();

        return response()->json([
            'message' => 'Password reset request approved.',
            'email' => $resetRequest->email,
            'full_name' => $resetRequest->user->name ?? '',
            'verification_code' => $code
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /admin/password-resets/{id}/reject
    // Executive rejects the request
    // -------------------------------------------------------------------------
    public function reject($id)
    {
        $resetRequest = PasswordResetRequest::findOrFail($id);

        if ($resetRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is not pending.'], 400);
        }

        $resetRequest->status = 'rejected';
        $resetRequest->save();

        return response()->json(['message' => 'Password reset request rejected.']);
    }
}
