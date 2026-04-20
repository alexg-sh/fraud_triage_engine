<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessOrderTriage;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class ProcessOrderTriageTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_updates_low_risk_orders_without_calling_ai(): void
    {
        Queue::fake();

        $order = Order::factory()->create([
            'customer_email' => 'buyer@example.com',
            'total_amount' => 99.99,
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '10 Downing Street, London, United Kingdom',
        ]);

        app()->call([new ProcessOrderTriage($order->id), 'handle']);

        $order->refresh();

        $this->assertSame(0.0, $order->risk_score);
        $this->assertSame([], $order->risk_signals);
        $this->assertNull($order->ai_investigation_note);
    }

    public function test_job_scores_high_risk_orders_without_generating_ai_note(): void
    {
        Queue::fake();

        Order::factory()->count(3)->create([
            'ip_address' => '203.0.113.50',
            'created_at' => now()->subMinutes(10),
            'updated_at' => now()->subMinutes(10),
        ]);

        $order = Order::factory()->create([
            'customer_email' => 'watchlist@maildrop.cc',
            'ip_address' => '203.0.113.50',
            'total_amount' => 2450.00,
            'billing_address' => '221B Baker Street, London, United Kingdom',
            'shipping_address' => '1 Courier Way, Bucharest, Romania',
        ]);

        app()->call([new ProcessOrderTriage($order->id), 'handle']);

        $order->refresh();

        $this->assertSame(72.0, $order->risk_score);
        $this->assertSame([
            'Billing/shipping country mismatch (UNITED KINGDOM vs ROMANIA)',
            'High basket value exceeds GBP 2,000',
            'High order frequency from shared IP (3 recent)',
            'Disposable or suspicious email domain',
        ], $order->risk_signals);
        $this->assertNull($order->ai_investigation_note);
    }
}
