<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'vessels', 'cargo_manifests', 'containers',
            'anchorage_requests', 'port_clearances',
            'discharge_requests', 'wharves', 'notifications', 'reports',
        ];
        
        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (!Schema::hasColumn($table, 'deleted_at')) {
                    $t->softDeletes();
                }
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'vessels', 'cargo_manifests', 'containers',
            'anchorage_requests', 'port_clearances',
            'discharge_requests', 'wharves', 'notifications', 'reports',
        ];
        
        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (Schema::hasColumn($table, 'deleted_at')) {
                    $t->dropSoftDeletes();
                }
            });
        }
    }
};
