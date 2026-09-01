<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class StorageKeywordSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $keywords = [
            // Chemical
            ['keyword' => 'acid', 'storage_type' => 'chemical'],
            ['keyword' => 'toxin', 'storage_type' => 'chemical'],
            ['keyword' => 'toxic', 'storage_type' => 'chemical'],
            ['keyword' => 'fertilizer', 'storage_type' => 'chemical'],
            ['keyword' => 'chemical', 'storage_type' => 'chemical'],
            ['keyword' => 'hazardous', 'storage_type' => 'chemical'],
            ['keyword' => 'flammable', 'storage_type' => 'chemical'],
            
            // Frozen
            ['keyword' => 'frozen', 'storage_type' => 'frozen'],
            ['keyword' => 'meat', 'storage_type' => 'frozen'],
            ['keyword' => 'chicken', 'storage_type' => 'frozen'],
            ['keyword' => 'fish', 'storage_type' => 'frozen'],
            ['keyword' => 'refrigerated', 'storage_type' => 'frozen'],
            
            // Dry
            ['keyword' => 'iron', 'storage_type' => 'dry'],
            ['keyword' => 'steel', 'storage_type' => 'dry'],
            ['keyword' => 'wood', 'storage_type' => 'dry'],
            ['keyword' => 'cargo', 'storage_type' => 'dry'],
        ];

        foreach ($keywords as $data) {
            \App\Models\StorageKeyword::firstOrCreate($data);
        }
    }
}
