<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            $table->text('exit_reason')->nullable()->after('rejection_reason');
            $table->datetime('emergency_departed_at')->nullable()->after('exit_reason');
        });
    }

    public function down(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            $table->dropColumn(['exit_reason', 'emergency_departed_at']);
        });
    }
};
