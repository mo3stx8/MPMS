<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logs', function (Blueprint $table) {
            $table->string('vessel_name')->nullable()->after('vessel_id');
        });

        // Backfill existing logs: extract vessel name from the details text
        $logs = \App\Models\Log::whereNull('vessel_name')->get();
        foreach ($logs as $log) {
            $vesselName = null;
            $details = $log->details ?? '';

            // Try the vessel relationship first
            if ($log->vessel_id) {
                $vessel = \App\Models\Vessel::find($log->vessel_id);
                if ($vessel) {
                    $vesselName = $vessel->name;
                }
            }

            // Fallback: parse from details string
            if (!$vesselName) {
                if (str_contains($details, 'Scheduled ')) {
                    $parts = explode('Scheduled ', $details, 2);
                    $vesselName = explode(' to ', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'Approved vessel ')) {
                    $parts = explode('Approved vessel ', $details, 2);
                    $vesselName = explode(' arrival', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'Issued clearance for vessel ')) {
                    $parts = explode('Issued clearance for vessel ', $details, 2);
                    $vesselName = explode(' to ', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'Approved clearance for vessel ')) {
                    $parts = explode('Approved clearance for vessel ', $details, 2);
                    $vesselName = trim($parts[1] ?? '') ?: null;
                } elseif (str_contains($details, 'Rejected clearance for vessel ')) {
                    $parts = explode('Rejected clearance for vessel ', $details, 2);
                    $vesselName = explode('.', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'Released ')) {
                    $parts = explode('Released ', $details, 2);
                    $vesselName = explode(' from ', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'Vessel ')) {
                    $parts = explode('Vessel ', $details, 2);
                    $vesselName = explode(' has ', $parts[1] ?? '')[0] ?? null;
                } elseif (str_contains($details, 'vessel ')) {
                    $parts = explode('vessel ', $details, 2);
                    $rest = $parts[1] ?? '';
                    $vesselName = explode(' ', $rest)[0] ?? null;
                    if ($vesselName === '') $vesselName = null;
                } elseif (str_contains($details, 'arrival for vessel ')) {
                    $parts = explode('arrival for vessel ', $details, 2);
                    $vesselName = trim(explode('.', $parts[1] ?? '')[0]) ?: null;
                } elseif (str_contains($details, 'anchorage for vessel ')) {
                    $parts = explode('anchorage for vessel ', $details, 2);
                    $vesselName = trim(explode('.', $parts[1] ?? '')[0]) ?: null;
                }
            }

            if ($vesselName) {
                $log->vessel_name = trim($vesselName);
                $log->save();
            }
        }
    }

    public function down(): void
    {
        Schema::table('logs', function (Blueprint $table) {
            $table->dropColumn('vessel_name');
        });
    }
};
