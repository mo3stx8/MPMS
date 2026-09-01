<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Wharf;

class WharfSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $wharves = [
            ['name' => 'Wharf A', 'status' => 'available'],
            ['name' => 'Wharf B', 'status' => 'available'],
            ['name' => 'Wharf C', 'status' => 'available'],
        ];

        foreach ($wharves as $wharf) {
            Wharf::firstOrCreate(['name' => $wharf['name']], $wharf);
        }
    }
}
