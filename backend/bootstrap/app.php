<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))

    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware) {
        $middleware->use([
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Trust known proxies / load balancers so URL generation and secure cookies
        // work correctly behind a reverse proxy or TLS terminator.
        if ($proxyIps = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(
                at: explode(',', $proxyIps),
                headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
                    | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
                    | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
                    | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
                    | \Illuminate\Http\Request::HEADER_X_FORWARDED_PREFIX,
            );
        }

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
