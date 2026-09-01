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
        Schema::table('discharge_requests', function (Blueprint $table) {
            $table->string('batch_id')->nullable();
            $table->unsignedBigInteger('vessel_id')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->foreign('vessel_id')->references('id')->on('vessels')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discharge_requests', function (Blueprint $table) {
            $table->dropForeign(['vessel_id']);
            $table->dropColumn(['batch_id', 'vessel_id', 'rejection_reason']);
        });
    }
};
