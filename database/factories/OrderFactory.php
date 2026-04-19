<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
final class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $country = fake()->randomElement(['United Kingdom', 'France', 'Germany', 'Spain']);

        return [
            'customer_email' => fake()->safeEmail(),
            'total_amount' => fake()->randomFloat(2, 25, 650),
            'ip_address' => fake()->ipv4(),
            'billing_address' => sprintf(
                '%s, %s, %s',
                fake()->streetAddress(),
                fake()->city(),
                $country,
            ),
            'shipping_address' => sprintf(
                '%s, %s, %s',
                fake()->streetAddress(),
                fake()->city(),
                $country,
            ),
            'risk_score' => 0,
            'ai_investigation_note' => null,
        ];
    }
}
