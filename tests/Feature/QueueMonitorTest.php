<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class QueueMonitorTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_monitor_renders_database_queue_stats(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 72.4,
            'ai_investigation_note' => 'Shared IP and cross-border mismatch require review.',
        ]);

        $response = $this->get('/horizon');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ops/queue-monitor')
                ->where('stats.review_orders', 1)
                ->where('runtime.queue_connection', config('queue.default'))
            );
    }
}
