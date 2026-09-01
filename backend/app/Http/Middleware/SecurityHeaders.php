<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Apply hardened HTTP security headers to every response.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Content Security Policy - restrict resource origins.
        // Nonces would be required for full inline-script support; the default
        // below locks down external origins while keeping the SPA functional.
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; " .
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " .
            "style-src 'self' 'unsafe-inline'; " .
            "img-src 'self' data: blob: https://www.gstatic.com https://www.google.com; " .
            "font-src 'self' data:; " .
            "connect-src 'self' ws: wss:; " .
            "object-src 'none'; " .
            "frame-ancestors 'none'; " .
            "base-uri 'self'; " .
            "form-action 'self'"
        );

        // Prevent clickjacking
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy - limit browser feature access
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

        // Cross-Origin-Opener-Policy for process isolation
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');

        // HSTS is applied conditionally once the app runs over HTTPS
        if (!config('app.debug')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Suppress the Laravel/PHP framework version disclosure header if present
        $response->headers->remove('X-Powered-By');

        return $response;
    }
}
