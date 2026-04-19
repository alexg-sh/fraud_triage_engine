<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Order;
use App\Services\OrderRiskScorer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderRiskScorerTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_order_scores_zero(): void
    {
        Queue::fake();

        $order = Order::factory()->create([
            'customer_email' => 'buyer@example.com',
            'total_amount' => 120.00,
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '10 Downing Street, London, United Kingdom',
        ]);

        $profile = app(OrderRiskScorer::class)->score($order);

        $this->assertSame(0.0, $profile->score);
        $this->assertSame([], $profile->signals);
    }

    public function test_weighted_signals_accumulate_and_clamp_to_one_hundred(): void
    {
        Queue::fake();

        Order::factory()->count(3)->create([
            'ip_address' => '203.0.113.44',
            'created_at' => now()->subMinutes(20),
            'updated_at' => now()->subMinutes(20),
        ]);

        $order = Order::factory()->create([
            'customer_email' => 'alert@tempmail.test',
            'ip_address' => '203.0.113.44',
            'total_amount' => 3200.00,
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '1 Courier Way, Bucharest, Romania',
        ]);

        $profile = app(OrderRiskScorer::class)->score($order);

        $this->assertSame(100.0, $profile->score);
        $this->assertCount(4, $profile->signals);
        $this->assertTrue($profile->shouldEscalate());
    }
}
