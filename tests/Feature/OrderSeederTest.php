<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Database\Seeders\OrderSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_seeder_creates_expected_distribution(): void
    {
        Queue::fake();

        $this->seed(OrderSeeder::class);

        $orders = Order::query()->get();

        $this->assertCount(1000, $orders);
        $this->assertGreaterThanOrEqual(15, $orders->where('total_amount', '>', 2000)->count());
        $this->assertGreaterThanOrEqual(15, $orders->filter(function (Order $order): bool {
            return str_ends_with($order->shipping_address, 'Romania')
                && str_ends_with($order->billing_address, 'United Kingdom');
        })->count());
        $this->assertGreaterThanOrEqual(35, $orders->filter(function (Order $order): bool {
            return str_ends_with($order->customer_email, '@tempmail.test')
                || str_ends_with($order->customer_email, '@maildrop.cc');
        })->count());
        $this->assertGreaterThan(0, $orders->where('risk_score', '>=', 50)->count());
        $this->assertSame(0, $orders->whereNotNull('ai_investigation_note')->count());
    }
}
