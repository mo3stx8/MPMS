<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add notes column to discharge_requests
        if (!Schema::hasColumn('discharge_requests', 'notes')) {
            Schema::table('discharge_requests', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('rejection_reason');
            });
        }

        // 2. Expand containers status enum to include 'discharged' and 'assigned'
        // SQLite stores enums as TEXT with CHECK constraint - we need to recreate to expand
        // Since Laravel/SQLite doesn't support ALTER COLUMN for enums, we use a raw approach
        // First check if 'discharged' is already a valid value by attempting to check existing data
        // We'll use a string column approach (drop enum constraint) for SQLite compatibility
        Schema::table('containers', function (Blueprint $table) {
            // Change status to a plain string column to allow any value
            // SQLite-compatible: rename, recreate, copy
            $table->string('status_new')->default('pending')->after('status');
        });

        DB::table('containers')->get()->each(function ($row) {
            DB::table('containers')->where('id', $row->id)->update(['status_new' => $row->status]);
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->renameColumn('status_new', 'status');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('discharge_requests', 'notes')) {
            Schema::table('discharge_requests', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
