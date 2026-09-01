<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logs', function (Blueprint $table) {
            $table->unsignedBigInteger('vessel_id')->nullable()->after('user_id');
            $table->foreign('vessel_id')->references('id')->on('vessels')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('logs', function (Blueprint $table) {
            $table->dropForeign(['vessel_id']);
            $table->dropColumn('vessel_id');
        });
    }
};
