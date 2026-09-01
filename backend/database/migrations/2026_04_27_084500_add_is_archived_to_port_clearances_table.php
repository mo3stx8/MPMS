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
        Schema::table('port_clearances', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('rejection_reason');
            $table->dateTime('departed_at')->nullable()->after('is_archived');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('port_clearances', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'departed_at']);
        });
    }
};
