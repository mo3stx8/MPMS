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
            $table->string('certificate_path')->nullable();
            $table->text('rejection_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('port_clearances', function (Blueprint $table) {
            $table->dropColumn(['certificate_path', 'rejection_reason']);
        });
    }
};
