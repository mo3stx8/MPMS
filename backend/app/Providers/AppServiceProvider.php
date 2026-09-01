<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Contracts\Routing\UrlGenerator;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS for all generated URLs when enabled (set APP_FORCE_HTTPS=true in production)
        if (filter_var(env('APP_FORCE_HTTPS', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->app['url']->forceScheme('https');
        }
    }
}
