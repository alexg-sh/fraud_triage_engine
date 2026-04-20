<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessOrderTriage;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class DemoOrderBatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_batch_creates_mixed_orders_and_dispatches_triage_jobs(): void
    {
        Queue::fake();

        $response = $this->post('/orders/demo-batch', [
            'count' => 25,
        ]);

        $response
            ->assertRedirect('/orders')
            ->assertSessionHas('status', 'Queued 25 demo orders for triage (17 expected clear, 8 expected review).');

        $orders = Order::query()->get();

        $this->assertCount(25, $orders);
        $this->assertSame(17, $orders->filter(fn (Order $order): bool => (float) $order->total_amount < 2000.0)->count());
        $this->assertSame(8, $orders->filter(fn (Order $order): bool => (float) $order->total_amount > 2000.0)->count());
        $this->assertSame(8, $orders->filter(function (Order $order): bool {
            return str_ends_with($order->customer_email, '@tempmail.test')
                || str_ends_with($order->customer_email, '@maildrop.cc');
        })->count());

        Queue::assertPushed(ProcessOrderTriage::class, 25);
    }
}
