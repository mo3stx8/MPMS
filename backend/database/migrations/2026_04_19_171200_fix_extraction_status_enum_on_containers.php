<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support ENUM or ALTER COLUMN natively.
        // The enum('extraction_status', [...]) in Laravel/SQLite is stored as a TEXT column
        // with a CHECK constraint. We need to recreate the column with the expanded values.

        // Step 1: Add a temporary column
        Schema::table('containers', function (Blueprint $table) {
            $table->string('extraction_status_new')->default('pending')->after('extraction_status');
        });

        // Step 2: Copy data, mapping 'success' -> 'extracted'
        DB::table('containers')->get()->each(function ($row) {
            $newVal = $row->extraction_status === 'success' ? 'extracted' : ($row->extraction_status ?: 'pending');
            DB::table('containers')->where('id', $row->id)->update(['extraction_status_new' => $newVal]);
        });

        // Step 3: Drop old column and rename new one
        Schema::table('containers', function (Blueprint $table) {
            $table->dropColumn('extraction_status');
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->renameColumn('extraction_status_new', 'extraction_status');
        });
    }

    public function down(): void
    {
        // Reverse: map 'extracted' back to 'success', 'pending' back to 'failed'
        Schema::table('containers', function (Blueprint $table) {
            $table->string('extraction_status_old')->default('success')->after('extraction_status');
        });

        DB::table('containers')->get()->each(function ($row) {
            $val = $row->extraction_status;
            if ($val === 'extracted') $val = 'success';
            if ($val === 'pending') $val = 'failed';
            DB::table('containers')->where('id', $row->id)->update(['extraction_status_old' => $val]);
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->dropColumn('extraction_status');
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->renameColumn('extraction_status_old', 'extraction_status');
        });
    }
};
