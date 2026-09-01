<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StorageArea>
 */
class StorageAreaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $capacity = $this->faker->numberBetween(1000, 10000);
        $used = $this->faker->numberBetween(0, $capacity);
        
        $percentage = ($used / $capacity) * 100;
        $status = 'available';
        if ($percentage >= 90) {
            $status = 'full';
        } elseif ($percentage >= 70) {
            $status = 'near_full';
        }

        return [
            'name' => $this->faker->regexify('Zone [A-Z]-[0-9]{2}'),
            'capacity' => $capacity,
            'used' => $used,
            'type' => $this->faker->randomElement(['general', 'refrigerated', 'hazardous', 'bulk']),
            'status' => $status,
        ];
    }
}
