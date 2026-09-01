<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            Schema::table('vessels', function (Blueprint $table) {
                $table->index('name');
                $table->index('imo_number');
            });
        } catch (\Exception $e) {
            // Index might already exist
        }

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('name');
            });
        } catch (\Exception $e) {
            // Index might already exist
        }

        try {
            Schema::table('containers', function (Blueprint $table) {
                $table->index('consignee_name');
                $table->index('consignee_phone');
            });
        } catch (\Exception $e) {
            // Index might already exist
        }

        try {
            Schema::table('logs', function (Blueprint $table) {
                $table->index('action');
                $table->index('vessel_name');
            });
        } catch (\Exception $e) {
            // Index might already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('vessels', function (Blueprint $table) {
                $table->dropIndex(['name']);
                $table->dropIndex(['imo_number']);
            });
        } catch (\Exception $e) {
            // Index might not exist
        }

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex(['name']);
            });
        } catch (\Exception $e) {
            // Index might not exist
        }

        try {
            Schema::table('containers', function (Blueprint $table) {
                $table->dropIndex(['consignee_name']);
                $table->dropIndex(['consignee_phone']);
            });
        } catch (\Exception $e) {
            // Index might not exist
        }

        try {
            Schema::table('logs', function (Blueprint $table) {
                $table->dropIndex(['action']);
                $table->dropIndex(['vessel_name']);
            });
        } catch (\Exception $e) {
            // Index might not exist
        }
    }
};
