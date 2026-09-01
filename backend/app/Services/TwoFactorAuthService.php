<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Crypt;

class TwoFactorAuthService
{
    /**
     * Generate a new base32-encoded TOTP secret, encrypted before storage.
     *
     * @return array{secret: string, encrypted: string, qr: string, otpauth: string}
     */
    public function generateSetupPayload(User $user): array
    {
        $secret       = $this->generateBase32Secret(20);
        $encrypted    = Crypt::encryptString($secret);
        $issuer       = config('app.name', 'Manarah Port System');
        $label        = $issuer . ':' . $user->email;
        $otpauth      = 'otpauth://totp/' . rawurlencode($label)
            . '?secret=' . $secret
            . '&issuer=' . rawurlencode($issuer)
            . '&digits=6&period=30';

        // data URI QR payload consumable by a QR library (otpauth string)
        $qr = 'data:text/plain;charset=utf-8,' . rawurlencode($otpauth);

        return [
            'secret'      => $secret,
            'encrypted'   => $encrypted,
            'qr'          => $qr,
            'otpauth'     => $otpauth,
        ];
    }

    /**
     * Verify a TOTP code against the user's stored secret.
     * Accepts a small window (current, -1 and +1 period) to tolerate clock drift.
     */
    public function verify(User $user, string $code): bool
    {
        $decrypted = $this->decryptSecret($user);
        if ($decrypted === null) {
            return false;
        }

        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $timestamp = time();
        for ($window = -1; $window <= 1; $window++) {
            if ($this->generateTOTP($decrypted, $timestamp + ($window * 30)) === $code) {
                return true;
            }
        }

        return false;
    }

    public function generateRecoveryCodes(int $count = 10): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = Str::upper(Str::random(8) . '-' . Str::random(4));
        }
        return $codes;
    }

    /**
     * Enable 2FA by persisting the (already-confirmed) secret and codes.
     */
    public function enable(User $user, string $encryptedSecret, array $recoveryCodes): void
    {
        $user->two_factor_secret         = $encryptedSecret;
        $user->two_factor_recovery_codes = Crypt::encryptString(json_encode($recoveryCodes));
        $user->two_factor_confirmed_at   = now();
        $user->save();
    }

    public function disable(User $user): void
    {
        $user->two_factor_secret         = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at   = null;
        $user->save();
    }

    public function isEnabled(User $user): bool
    {
        return $user->two_factor_confirmed_at !== null
            && !empty($user->two_factor_secret);
    }

    /**
     * @return string[]|null
     */
    public function getRecoveryCodes(User $user): ?array
    {
        if (empty($user->two_factor_recovery_codes)) {
            return null;
        }
        return json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true);
    }

    /**
     * Consume a recovery code if valid; returns true when used successfully.
     */
    public function useRecoveryCode(User $user, string $code): bool
    {
        $codes = $this->getRecoveryCodes($user);
        if ($codes === null) {
            return false;
        }

        $code = Str::upper(trim($code));
        $key  = array_search($code, $codes, true);
        if ($key === false) {
            return false;
        }

        unset($codes[$key]);
        $user->two_factor_recovery_codes = Crypt::encryptString(json_encode(array_values($codes)));
        $user->save();

        return true;
    }

    private function decryptSecret(User $user): ?string
    {
        if (empty($user->two_factor_secret)) {
            return null;
        }
        try {
            return Crypt::decryptString($user->two_factor_secret);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function generateBase32Secret(int $bytes): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret   = '';
        $random   = random_bytes($bytes);
        $len      = strlen($random);
        for ($i = 0; $i < $len; $i++) {
            $secret .= $alphabet[ord($random[$i]) & 31];
        }
        return $secret;
    }

    /**
     * RFC 6238 - TOTP (HMAC-SHA1, 6 digits, 30s period).
     */
    private function generateTOTP(string $base32Secret, int $counter): string
    {
        $secret = $this->base32Decode($base32Secret);
        $time   = pack('N*', 0, $counter);

        $hash     = hash_hmac('sha1', $time, $secret, true);
        $offset   = ord($hash[strlen($hash) - 1]) & 0x0F;
        $trunc    = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $trunc, 6, '0', STR_PAD_LEFT);
    }

    private function base32Decode(string $base32): string
    {
        $alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $buffer    = 0;
        $bitsLeft  = 0;
        $result    = '';

        foreach (str_split(strtoupper($base32)) as $char) {
            $pos = strpos($alphabet, $char);
            if ($pos === false) {
                continue;
            }
            $buffer  = ($buffer << 5) | $pos;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $result  .= chr(($buffer >> ($bitsLeft - 8)) & 0xFF);
                $bitsLeft -= 8;
            }
        }

        return $result;
    }
}
