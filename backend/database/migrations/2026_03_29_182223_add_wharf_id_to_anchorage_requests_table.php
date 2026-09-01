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
            $table->unsignedBigInteger('wharf_id')->nullable()->after('location');
            $table->timestamp('wharf_assigned_at')->nullable()->after('wharf_id');
            $table->foreign('wharf_id')->references('id')->on('wharves')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('anchorage_requests', function (Blueprint $table) {
            $table->dropForeign(['wharf_id']);
            $table->dropColumn(['wharf_id', 'wharf_assigned_at']);
        });
    }
};
