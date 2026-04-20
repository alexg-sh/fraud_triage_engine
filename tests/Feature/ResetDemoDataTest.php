<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class ResetDemoDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_demo_data_clears_orders_jobs_and_demo_cache(): void
    {
        Order::factory()->count(3)->create();
        DB::table('jobs')->insert([
            'queue' => 'triage',
            'payload' => '{}',
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => now()->timestamp,
            'created_at' => now()->timestamp,
        ]);
        Cache::forever('demo_queue.total_runs', 5);
        Cache::forever('demo_queue.last_run', [
            'reference' => 'RESET1',
            'queue' => 'default',
            'completed_at' => now()->toIso8601String(),
            'total_runs' => 5,
        ]);

        $response = $this->post('/orders/reset-demo-data');

        $response
            ->assertRedirect('/orders')
            ->assertSessionHas('status', 'Demo data reset. Orders and queued jobs cleared.');

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertFalse(Cache::has('demo_queue.total_runs'));
        $this->assertFalse(Cache::has('demo_queue.last_run'));
    }
}
