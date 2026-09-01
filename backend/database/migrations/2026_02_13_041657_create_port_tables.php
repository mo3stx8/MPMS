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

        Schema::create('wharves', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('capacity');
            $table->string('status')->default('available');
            $table->timestamps();
        });

        Schema::create('vessels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->string('flag')->nullable();
            $table->unsignedBigInteger('owner_id'); // User ID (Agent)
            $table->string('status')->default('awaiting');
            $table->dateTime('eta')->nullable();
            $table->unsignedBigInteger('current_wharf_id')->nullable();
            $table->timestamps();

            $table->foreign('owner_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('current_wharf_id')->references('id')->on('wharves')->onDelete('set null');
        });

        Schema::create('cargo_manifests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vessel_id');
            $table->unsignedBigInteger('uploaded_by'); // User ID (Agent)
            $table->string('status')->default('pending');
            $table->string('file_path');
            $table->decimal('total_weight', 10, 2);
            $table->integer('container_count');
            $table->timestamps();

            $table->foreign('vessel_id')->references('id')->on('vessels')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('containers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('manifest_id');
            $table->string('container_number');
            $table->string('type');
            $table->decimal('weight', 10, 2);
            $table->string('trader_email')->nullable();
            $table->string('status')->default('arrived');
            $table->string('location')->nullable();
            $table->timestamps();

            $table->foreign('manifest_id')->references('id')->on('cargo_manifests')->onDelete('cascade');
        });

        Schema::create('discharge_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('container_id');
            $table->unsignedBigInteger('trader_id'); // User ID (Trader)
            $table->string('status')->default('pending');
            $table->dateTime('requested_date');
            $table->timestamps();

            $table->foreign('container_id')->references('id')->on('containers')->onDelete('cascade');
            $table->foreign('trader_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('port_clearances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vessel_id');
            $table->unsignedBigInteger('officer_id')->nullable(); // User ID (Officer)
            $table->dateTime('issue_date');
            $table->dateTime('expiry_date');
            $table->string('status')->default('valid');
            $table->timestamps();

            $table->foreign('vessel_id')->references('id')->on('vessels')->onDelete('cascade');
            $table->foreign('officer_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('action');
            $table->text('details')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('title');
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

        Schema::dropIfExists('notifications');
        Schema::dropIfExists('logs');
        Schema::dropIfExists('port_clearances');
        Schema::dropIfExists('discharge_requests');
        Schema::dropIfExists('containers');
        Schema::dropIfExists('cargo_manifests');
        Schema::dropIfExists('vessels');
        Schema::dropIfExists('wharves');

    }
};
