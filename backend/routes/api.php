<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,60');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

use App\Http\Controllers\Api\PasswordResetController;
Route::post('/password-reset/request', [PasswordResetController::class, 'requestReset'])->middleware('throttle:3,60');
Route::post('/password-reset/verify', [PasswordResetController::class, 'verifyCode'])->middleware('throttle:5,1');
Route::post('/password-reset/recreate', [PasswordResetController::class, 'recreatePassword'])->middleware('throttle:5,1');


use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\PortOfficerController;
use App\Http\Controllers\Api\WharfController;
use App\Http\Controllers\Api\TraderController;
use App\Http\Controllers\Api\ExecutiveController;
use App\Http\Controllers\Api\ManifestUploadController;

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TwoFactorController;

// Two-factor verification for the login flow (pre-token, so no auth middleware here).
Route::post('/2fa/verify', [TwoFactorController::class, 'verify'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/search', [SearchController::class, 'search']);
    
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    // User Profile Routes
    Route::get('/user/profile', [AuthController::class, 'getProfile']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/avatar', [AuthController::class, 'updateAvatar']);
    Route::put('/user/preferences', [AuthController::class, 'updatePreferences']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);
    Route::put('/user/signature', [AuthController::class, 'updateSignature']);

    // Two-Factor Authentication management (authenticated)
    Route::get('/2fa/setup', [TwoFactorController::class, 'setup']);
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/2fa/disable', [TwoFactorController::class, 'disable']);

    // Agent Routes
    Route::group(['middleware' => ['role:agent']], function () {
        Route::post('/agent/vessels', [AgentController::class, 'submitArrival']);
        Route::get('/agent/vessels/check-imo/{imo}', [AgentController::class, 'checkIMO']);
        Route::get('/agent/vessels', [AgentController::class, 'getVessels']);
        Route::post('/agent/manifests', [AgentController::class, 'uploadManifest']);
        Route::get('/agent/manifests', [AgentController::class, 'getManifests']);
        
        // NEW: Manifest Extraction & Upload Pipeline
        Route::post('/arrival-notifications/{id}/manifests', [ManifestUploadController::class, 'upload']);
        Route::post('/agent/vessels/{id}/finalize', [AgentController::class, 'finalizeArrival']);

        Route::post('/agent/anchorage', [AgentController::class, 'submitAnchorageRequest']);
        Route::put('/agent/anchorage/{id}', [AgentController::class, 'updateAnchorageRequest']);
        Route::post('/agent/anchorage/{id}/expand-duration', [AgentController::class, 'expandDuration']);
        Route::get('/agent/anchorage', [AgentController::class, 'getAnchorageRequests']);
        Route::get('/agent/stats', [AgentController::class, 'getDashboardStats']);
        Route::get('/agent/tracker', [AgentController::class, 'getTrackerData']);
        Route::post('/agent/clearance/request', [AgentController::class, 'requestClearance']);
        Route::get('/agent/clearances', [AgentController::class, 'getClearances']);
        Route::post('/agent/clearance', [AgentController::class, 'issueClearance']);
        Route::post('/agent/vessels/{id}/depart', [AgentController::class, 'executeDeparture']);
        Route::post('/agent/vessels/{id}/emergency-exit', [AgentController::class, 'emergencyExit']);
        Route::get('/agent/vessel-report', [AgentController::class, 'getVesselActivityReport']);

        // Edit endpoints
        Route::put('/agent/vessels/{id}', [AgentController::class, 'updateArrival']);
        Route::delete('/agent/vessels/{id}', [AgentController::class, 'deleteArrival']);
        Route::put('/agent/manifests/{id}', [AgentController::class, 'updateManifest']);
        Route::delete('/agent/manifests/{id}', [AgentController::class, 'deleteManifest']);
        Route::put('/agent/anchorage/{id}', [AgentController::class, 'updateAnchorageRequest']);
        Route::put('/agent/clearance/{id}', [AgentController::class, 'updateClearance']);
    });

    // Port Officer Routes
    Route::group(['middleware' => ['role:officer']], function () {
        Route::get('/officer/dashboard', [PortOfficerController::class, 'getDashboardStats']);
        Route::get('/officer/vessels', [PortOfficerController::class, 'getVessels']);
        Route::post('/officer/vessels/{id}/approve', [PortOfficerController::class, 'approveArrival']);
        Route::post('/officer/vessels/{id}/berth', [PortOfficerController::class, 'assignBerth']);
        Route::delete('/officer/vessels/{id}/berth', [PortOfficerController::class, 'releaseBerth']);
        Route::post('/officer/clearance', [PortOfficerController::class, 'issueClearance']);
        Route::post('/officer/clearance/{id}/approve', [PortOfficerController::class, 'approveClearance']);
        Route::post('/officer/clearance/{id}/reject', [PortOfficerController::class, 'rejectClearance']);
        Route::get('/officer/clearances', [PortOfficerController::class, 'getClearances']);
        Route::get('/officer/logs', [PortOfficerController::class, 'getLogs']);
        Route::get('/officer/logs/export', [PortOfficerController::class, 'exportLogs']);
        Route::get('/officer/wharves', [PortOfficerController::class, 'getWharves']);
        // NEW: Scheduled anchorage handoffs from Wharf worker
        Route::get('/officer/scheduled-anchorage', [PortOfficerController::class, 'getScheduledAnchorage']);
        Route::get('/officer/report', [PortOfficerController::class, 'getPortReport']);
        // Vessel History (reuses ExecutiveController)
        Route::get('/officer/vessels-list', [ExecutiveController::class, 'getAllVessels']);
        Route::get('/officer/vessels/{id}/history', [ExecutiveController::class, 'getVesselHistory']);
    });

    // Wharf Routes
    Route::group(['middleware' => ['role:wharf']], function () {
        Route::get('/wharf/wharves', [WharfController::class, 'getWharves']);
        Route::patch('/wharf/wharves/{id}', [WharfController::class, 'updateWharfStatus']);
        Route::get('/wharf/dashboard', [WharfController::class, 'getDashboardStats']);
        Route::get('/wharf/containers', [WharfController::class, 'getContainers']);
        Route::get('/wharf/storage-areas', [WharfController::class, 'getStorageAreas']);
        Route::put('/wharf/{id}/status', [WharfController::class, 'updateWharfStatus']);
        Route::post('/wharf/assign-container', [WharfController::class, 'assignContainer']);
        Route::post('/wharf/containers/{id}/log', [WharfController::class, 'logContainerOperation']);
        Route::post('/wharf/containers/{id}/reclassify', [WharfController::class, 'reclassifyContainer']);
        Route::post('/wharf/vessels/{id}/discharge-containers', [WharfController::class, 'dischargeContainers']);

        // NEW: Anchorage request workflow endpoints
        Route::get('/wharf/anchorage-requests', [WharfController::class, 'getAnchorageRequests']);
        Route::post('/wharf/anchorage-requests/{id}/approve', [WharfController::class, 'approveAnchorageRequest']);
        Route::post('/wharf/anchorage-requests/{id}/waitlist', [WharfController::class, 'waitlistAnchorageRequest']);
        Route::post('/wharf/anchorage-requests/{id}/timeout', [WharfController::class, 'triggerTimeoutNotification']);
        
        // NEW: Discharge requests workflow endpoints
        Route::get('/wharf/discharge-requests', [WharfController::class, 'getDischargeRequests']);
        Route::post('/wharf/discharge-requests/{batchId}/approve', [WharfController::class, 'approveDischargeRequest']);
        Route::post('/wharf/discharge-requests/{batchId}/decline', [WharfController::class, 'declineDischargeRequest']);

        // Vessel History (reuses ExecutiveController)
        Route::get('/wharf/vessels-list', [ExecutiveController::class, 'getAllVessels']);
        Route::get('/wharf/vessels/{id}/history', [ExecutiveController::class, 'getVesselHistory']);
    });

    // Trader Routes
    Route::group(['middleware' => ['role:trader']], function () {
        Route::get('/trader/dashboard', [TraderController::class, 'getDashboardStats']);
        Route::get('/trader/my-containers', [TraderController::class, 'getContainers']);
        Route::post('/trader/discharge-request', [TraderController::class, 'requestDischarge']);
        Route::get('/trader/discharge-requests', [TraderController::class, 'getDischargeRequests']);
    });

    // Executive Routes
    Route::group(['middleware' => ['role:executive']], function () {
        Route::get('/executive/logs', [ExecutiveController::class, 'getLogs']);
        Route::get('/executive/reports', [ExecutiveController::class, 'getReports']);
        Route::get('/executive/dashboard', [ExecutiveController::class, 'getDashboardStats']);
        Route::get('/executive/analytics', [ExecutiveController::class, 'getAnalytics']);
        Route::post('/executive/reports/generate', [ExecutiveController::class, 'generateReport']);
        Route::get('/executive/vessels', [ExecutiveController::class, 'getAllVessels']);
        Route::get('/executive/vessels/{id}/history', [ExecutiveController::class, 'getVesselHistory']);
        Route::get('/executive/approvals', [ExecutiveController::class, 'getPendingApprovals']);
        Route::get('/executive/users/pending', [ExecutiveController::class, 'getPendingUsers']);
        Route::post('/executive/users/{id}/approve', [ExecutiveController::class, 'approveUser']);
        Route::post('/executive/users/{id}/reject', [ExecutiveController::class, 'rejectUser']);
        Route::post('/executive/arrivals/{id}/approve', [ExecutiveController::class, 'approveArrival']);
        Route::post('/executive/arrivals/{id}/reject', [ExecutiveController::class, 'rejectArrival']);
        Route::get('/executive/anchorage/requests', [ExecutiveController::class, 'getAnchorageRequests']);
        Route::post('/executive/anchorage/{id}/approve', [ExecutiveController::class, 'approveAnchorage']);
        Route::post('/executive/anchorage/{id}/reject', [ExecutiveController::class, 'rejectAnchorage']);
        Route::get('/executive/decisions', [ExecutiveController::class, 'getRecentDecisions']);
        Route::get('/executive/emergency-exits', [ExecutiveController::class, 'getEmergencyExits']);

        // ── Admin: User Management ────────────────────────────────────────────
        Route::get('/admin/users',                [AdminController::class, 'index']);    // list + filter
        Route::post('/admin/users',               [AdminController::class, 'store']);    // direct create
        Route::put('/admin/users/{id}',           [AdminController::class, 'update']);   // modify
        Route::patch('/admin/users/{id}',         [AdminController::class, 'update']);   // modify (alias)
        Route::delete('/admin/users/{id}',        [AdminController::class, 'destroy']); // soft-delete
        Route::post('/admin/users/{id}/restore',  [AdminController::class, 'restore']); // restore
        
        // ── Admin: Password Resets ──────────────────────────────────────────
        Route::get('/admin/password-resets', [\App\Http\Controllers\Api\AdminPasswordResetController::class, 'index']);
        Route::post('/admin/password-resets/{id}/approve', [\App\Http\Controllers\Api\AdminPasswordResetController::class, 'approve']);
        Route::post('/admin/password-resets/{id}/reject', [\App\Http\Controllers\Api\AdminPasswordResetController::class, 'reject']);
    });
});
