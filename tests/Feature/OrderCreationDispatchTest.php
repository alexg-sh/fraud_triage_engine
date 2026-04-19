<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessOrderTriage;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderCreationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_creation_dispatches_triage_job(): void
    {
        Queue::fake();

        $response = $this->postJson('/orders', [
            'customer_email' => 'buyer@example.com',
            'total_amount' => 149.95,
            'ip_address' => '203.0.113.14',
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '10 Downing Street, London, United Kingdom',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.risk_score', 0);

        $order = Order::query()->firstOrFail();

        Queue::assertPushed(ProcessOrderTriage::class, function (ProcessOrderTriage $job) use ($order): bool {
            return $job->orderId === $order->id;
        });
    }
}
