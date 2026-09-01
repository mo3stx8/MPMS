<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add rejection_reason to vessels if it doesn't exist
        if (!Schema::hasColumn('vessels', 'rejection_reason')) {
            Schema::table('vessels', function (Blueprint $table) {
                $table->text('rejection_reason')->nullable()->after('status');
            });
        }

        // Modify containers status enum to include rejected_by_executive
        // Using Schema builder for cross-database compatibility
        Schema::table('containers', function (Blueprint $table) {
            $table->enum('status', ['pending', 'in_wharf', 'cleared', 'rejected_by_executive'])
                ->default('pending')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('vessels', 'rejection_reason')) {
            Schema::table('vessels', function (Blueprint $table) {
                $table->dropColumn('rejection_reason');
            });
        }

        Schema::table('containers', function (Blueprint $table) {
            $table->enum('status', ['pending', 'in_wharf', 'cleared'])
                ->default('pending')
                ->change();
        });
    }
};
