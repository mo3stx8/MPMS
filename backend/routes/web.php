<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

Route::get('/', function () {
    return view('welcome');
});

// Broadcasting auth endpoint for private/presence channels
// Uses Sanctum guard so that Bearer token auth works from the SPA frontend
Broadcast::routes(['middleware' => ['auth:sanctum']]);
