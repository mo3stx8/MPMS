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
        Schema::table('anchorage_requests', function (Blueprint $table) {
            $table->timestamp('anchorage_started_at')->nullable();
            $table->integer('duration_hours')->nullable();
            $table->timestamp('timeout_notified_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('anchorage_requests', function (Blueprint $table) {
            $table->dropColumn(['anchorage_started_at', 'duration_hours', 'timeout_notified_at']);
        });
    }
};
