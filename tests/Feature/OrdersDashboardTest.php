<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrdersDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_review_badge_and_ai_note(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 82.4,
            'ai_investigation_note' => 'Chargeback risk is elevated because the address pair conflicts with the order value.',
        ]);

        Order::factory()->create([
            'risk_score' => 12.5,
            'ai_investigation_note' => null,
        ]);

        $response = $this->get('/orders');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('stats.review_orders', 1)
                ->where('orders.data.0.requires_review', true)
                ->where(
                    'orders.data.0.ai_investigation_note',
                    'Chargeback risk is elevated because the address pair conflicts with the order value.',
                )
            );
    }

    public function test_review_filter_returns_only_orders_requiring_review(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 91.0,
            'ai_investigation_note' => 'Combined signals require manual review.',
        ]);

        Order::factory()->create([
            'risk_score' => 12.5,
            'ai_investigation_note' => null,
        ]);

        $response = $this->get('/orders?filter=review');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data.0.requires_review', true)
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
            );
    }
}
