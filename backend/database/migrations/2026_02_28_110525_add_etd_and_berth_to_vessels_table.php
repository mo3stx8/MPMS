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
        Schema::table('vessels', function (Blueprint $table) {
            $table->dateTime('etd')->nullable()->after('eta');
        // Using existing current_wharf_id for berth assignment
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            $table->dropColumn('etd');
        });
    }
};
