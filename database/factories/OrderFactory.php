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

    private const SAFE_COUNTRIES = ['United Kingdom', 'France', 'Germany', 'Spain'];

    private const RISKY_PAIRS = [
        ['United Kingdom', 'Romania'],
        ['Germany', 'Spain'],
        ['France', 'United Kingdom'],
    ];

    public function definition(): array
    {
        $country = fake()->randomElement(self::SAFE_COUNTRIES);

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
            'risk_signals' => [],
            'ai_investigation_note' => null,
            'decision_status' => null,
            'decision_note' => null,
            'decisioned_at' => null,
        ];
    }

    public function safe(): self
    {
        return $this->state(function (): array {
            $country = fake()->randomElement(self::SAFE_COUNTRIES);

            return [
                'customer_email' => fake()->safeEmail(),
                'total_amount' => fake()->randomFloat(2, 25, 650),
                'billing_address' => sprintf('%s, %s, %s', fake()->streetAddress(), fake()->city(), $country),
                'shipping_address' => sprintf('%s, %s, %s', fake()->streetAddress(), fake()->city(), $country),
            ];
        });
    }

    public function risky(string $sharedIp): self
    {
        return $this->state(function () use ($sharedIp): array {
            [$billingCountry, $shippingCountry] = fake()->randomElement(self::RISKY_PAIRS);

            return [
                'customer_email' => fake()->userName().'@'.fake()->randomElement(['tempmail.test', 'maildrop.cc']),
                'ip_address' => $sharedIp,
                'total_amount' => fake()->randomFloat(2, 2150, 4200),
                'billing_address' => sprintf('%s, %s, %s', fake()->streetAddress(), fake()->city(), $billingCountry),
                'shipping_address' => sprintf('%s, %s, %s', fake()->streetAddress(), fake()->city(), $shippingCountry),
            ];
        });
    }
}
