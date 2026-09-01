<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->unsignedBigInteger('storage_area_id')->nullable();
            $table->foreign('storage_area_id')
                  ->references('id')->on('storage_areas')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->dropForeign(['storage_area_id']);
            $table->dropColumn('storage_area_id');
        });
    }
};
