<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorAuthService;
use Illuminate\Http\Request;

class TwoFactorController extends Controller
{
    protected $twoFactor;

    public function __construct(TwoFactorAuthService $twoFactor)
    {
        $this->twoFactor = $twoFactor;
    }

    /**
     * GET /2fa/setup
     * Begin enrollment - returns a new secret + QR payload (not yet active).
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        if ($this->twoFactor->isEnabled($user)) {
            return response()->json(['message' => 'Two-factor authentication is already enabled for your account.'], 409);
        }

        $payload = $this->twoFactor->generateSetupPayload($user);

        // Persist the encrypted secret immediately so it can be confirmed in a
        // follow-up request; confirmation is what actually activates 2FA.
        $user->two_factor_secret = $payload['encrypted'];
        $user->save();

        return response()->json([
            'message'       => 'Scan the QR code with your authenticator app, then confirm with a code.',
            'secret'        => $payload['secret'],
            'qr'            => $payload['qr'],
            'otpauth'       => $payload['otpauth'],
            'recovery_codes' => $this->twoFactor->generateRecoveryCodes(),
        ]);
    }

    /**
     * POST /2fa/confirm
     * Confirm enrollment with a valid TOTP code (activates 2FA).
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user  = $request->user();
        $codes = $request->recovery_codes ?? $this->twoFactor->generateRecoveryCodes();

        if (!$this->twoFactor->verify($user, $request->code)) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        $recoveryCodes = is_array($codes) ? $codes : json_decode($codes, true) ?? [];
        $this->twoFactor->enable($user, $user->two_factor_secret, $recoveryCodes);

        return response()->json([
            'message'         => 'Two-factor authentication enabled.',
            'recovery_codes'  => $recoveryCodes,
        ]);
    }

    /**
     * POST /2fa/disable
     * Disable 2FA after verifying the current code or a recovery code.
     */
    public function disable(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();

        if (!$this->twoFactor->isEnabled($user)) {
            return response()->json(['message' => 'Two-factor authentication is not enabled.'], 409);
        }

        if (!$this->twoFactor->verify($user, $request->code) && !$this->twoFactor->useRecoveryCode($user, $request->code)) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        $this->twoFactor->disable($user);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    /**
     * POST /2fa/verify
     * Second-factor step during login (verifies code or recovery code before issuing a token).
     * Accepts the encrypted one-time challenge returned by the login endpoint.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code'             => 'required|string',
            'two_factor_token' => 'required|string',
        ]);

        $challenge = $this->decodeChallengeToken($request->two_factor_token);
        if ($challenge === null || $challenge['expires'] < now()->timestamp) {
            return response()->json(['message' => 'Login challenge expired. Please sign in again.'], 422);
        }

        $user = User::find($challenge['user_id']);
        if (!$user || !$this->twoFactor->isEnabled($user)) {
            return response()->json(['message' => 'Invalid login session. Please sign in again.'], 422);
        }

        if (!$this->twoFactor->verify($user, $request->code) && !$this->twoFactor->useRecoveryCode($user, $request->code)) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user,
        ]);
    }

    private function decodeChallengeToken(string $token): ?array
    {
        try {
            $data = json_decode(app(\Illuminate\Contracts\Encryption\Encrypter::class)->decrypt($token), true);
            return is_array($data) ? $data : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
