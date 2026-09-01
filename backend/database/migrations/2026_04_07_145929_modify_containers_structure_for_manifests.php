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
        // Step 1: Drop old foreign keys and columns
        Schema::table('containers', function (Blueprint $table) {
            $table->dropForeign(['manifest_id']);
            $table->dropColumn([
                'manifest_id',
                'container_number',
                'type',
                'weight',
                'trader_email',
                'status',
                'block',
                'row',
                'tier'
            ]);
        });

        // Step 2: Add new columns and foreign keys
        Schema::table('containers', function (Blueprint $table) {
            $table->unsignedBigInteger('vessel_id')->after('id');
            $table->string('manifest_file_path')->after('vessel_id');
            $table->string('port_of_loading')->after('manifest_file_path');
            $table->date('arrival_date')->after('port_of_loading');
            $table->text('description_of_goods')->after('arrival_date');
            $table->enum('storage_type', ['chemical', 'frozen', 'dry'])->default('dry')->after('description_of_goods');
            $table->string('consignee_name')->after('storage_type');
            $table->string('consignee_phone')->after('consignee_name');
            $table->unsignedBigInteger('trader_user_id')->nullable()->after('consignee_phone');
            $table->enum('status', ['pending', 'in_wharf', 'cleared'])->default('pending')->after('trader_user_id');

            $table->foreign('vessel_id')->references('id')->on('vessels')->onDelete('cascade');
            $table->foreign('trader_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->dropForeign(['vessel_id']);
            $table->dropForeign(['trader_user_id']);
            $table->dropColumn([
                'vessel_id',
                'manifest_file_path',
                'port_of_loading',
                'arrival_date',
                'description_of_goods',
                'storage_type',
                'consignee_name',
                'consignee_phone',
                'trader_user_id',
                'status'
            ]);

            $table->unsignedBigInteger('manifest_id');
            $table->string('container_number');
            $table->string('type');
            $table->decimal('weight', 10, 2);
            $table->string('trader_email')->nullable();
            $table->string('status')->default('arrived');
            $table->string('block')->nullable();
            $table->integer('row')->nullable();
            $table->integer('tier')->nullable();
            
            $table->foreign('manifest_id')->references('id')->on('cargo_manifests')->onDelete('cascade');
        });
    }
};
