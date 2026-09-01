<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        $permissions = [
            'submit_arrival',
            'approve_arrival',
            'manage_wharves',
            'request_discharge',
            'view_reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // create roles and assign existing permissions
        $agentRole = Role::firstOrCreate(['name' => 'agent']);
        $agentRole->givePermissionTo('submit_arrival');

        $officerRole = Role::firstOrCreate(['name' => 'officer']);
        $officerRole->givePermissionTo(['approve_arrival', 'view_reports']);

        $wharfRole = Role::firstOrCreate(['name' => 'wharf']);
        $wharfRole->givePermissionTo(['manage_wharves', 'view_reports']);

        $traderRole = Role::firstOrCreate(['name' => 'trader']);
        $traderRole->givePermissionTo('request_discharge');

        $executiveRole = Role::firstOrCreate(['name' => 'executive']);
        $executiveRole->givePermissionTo(['view_reports']);

        // Create test users
        $user = User::firstOrCreate(
            ['email' => 'agent@example.com'],
            [
                'name' => 'Test Agent',
                'verified' => true,
                'password' => Hash::make('password'),
            ]
        );
        $user->assignRole($agentRole);

        $user = User::firstOrCreate(
            ['email' => 'officer@example.com'],
            [
                'name' => 'Test Officer',
                'verified' => true,
                'password' => Hash::make('password'),
            ]
        );
        $user->assignRole($officerRole);

        $user = User::firstOrCreate(
            ['email' => 'wharf@example.com'],
            [
                'name' => 'Test Wharf Manager',
                'verified' => true,
                'password' => Hash::make('password'),
            ]
        );
        $user->assignRole($wharfRole);

        $user = User::firstOrCreate(
            ['email' => 'trader@example.com'],
            [
                'name' => 'Test Trader',
                'verified' => true,
                'password' => Hash::make('password'),
            ]
        );
        $user->assignRole($traderRole);

        $user = User::firstOrCreate(
            ['email' => 'executive@example.com'],
            [
                'name' => 'Test Executive',
                'verified' => true,
                'password' => Hash::make('password'),
            ]
        );
        $user->assignRole($executiveRole);
    }
}
