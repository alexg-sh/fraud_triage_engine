<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Jobs\ProcessOrderTriage;
use App\Models\Order;
use Illuminate\Database\Seeder;

final class OrderSeeder extends Seeder
{
    public function run(): void
    {
        Order::factory()->count(950)->create();

        $sharedIps = ['198.51.100.10', '198.51.100.11', '198.51.100.12', '198.51.100.13', '198.51.100.14'];
        $ordersForImmediateTriage = [];

        foreach (range(1, 20) as $index) {
            $ip = $sharedIps[$index % count($sharedIps)];

            $ordersForImmediateTriage[] = Order::factory()->create([
                'customer_email' => fake()->userName().'@tempmail.test',
                'ip_address' => $ip,
                'total_amount' => fake()->randomFloat(2, 2350, 3900),
                'billing_address' => sprintf('%s, %s, United Kingdom', fake()->streetAddress(), fake()->city()),
                'shipping_address' => sprintf('%s, %s, Romania', fake()->streetAddress(), fake()->city()),
                'created_at' => now()->subMinutes(60 - $index),
                'updated_at' => now()->subMinutes(60 - $index),
            ]);
        }

        foreach (range(1, 15) as $index) {
            $ordersForImmediateTriage[] = Order::factory()->create([
                'billing_address' => sprintf('%s, %s, United Kingdom', fake()->streetAddress(), fake()->city()),
                'shipping_address' => sprintf('%s, %s, Romania', fake()->streetAddress(), fake()->city()),
                'total_amount' => fake()->randomFloat(2, 2100, 3400),
                'created_at' => now()->subMinutes(30 - $index),
                'updated_at' => now()->subMinutes(30 - $index),
            ]);
        }

        foreach (range(1, 15) as $index) {
            $ordersForImmediateTriage[] = Order::factory()->create([
                'total_amount' => fake()->randomFloat(2, 2100, 4800),
                'customer_email' => fake()->userName().'@maildrop.cc',
                'ip_address' => $sharedIps[$index % count($sharedIps)],
                'billing_address' => sprintf('%s, %s, Germany', fake()->streetAddress(), fake()->city()),
                'shipping_address' => sprintf('%s, %s, Spain', fake()->streetAddress(), fake()->city()),
                'created_at' => now()->subMinutes(15 - $index),
                'updated_at' => now()->subMinutes(15 - $index),
            ]);
        }

        foreach ($ordersForImmediateTriage as $order) {
            app()->call([new ProcessOrderTriage($order->id), 'handle']);
        }
    }
}
