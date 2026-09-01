<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->unsignedBigInteger('generated_by')->nullable()->after('size');
            $table->date('report_date_from')->nullable()->after('generated_by');
            $table->date('report_date_to')->nullable()->after('report_date_from');

            $table->foreign('generated_by')
                  ->references('id')->on('users')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropForeign(['generated_by']);
            $table->dropColumn(['generated_by', 'report_date_from', 'report_date_to']);
        });
    }
};
