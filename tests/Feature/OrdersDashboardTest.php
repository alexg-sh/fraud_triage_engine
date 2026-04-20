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

    public function test_dashboard_renders_review_badge_and_persisted_note(): void
    {
        Queue::fake();

        $order = Order::factory()->create([
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
                ->where('orders.data.0.risk_signals', [])
                ->where('orders.data.0.decision_status', null)
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

    public function test_dashboard_can_search_by_email_and_ip(): void
    {
        Queue::fake();

        Order::factory()->create([
            'customer_email' => 'analyst-match@example.com',
            'ip_address' => '203.0.113.77',
        ]);

        Order::factory()->create([
            'customer_email' => 'other@example.com',
            'ip_address' => '198.51.100.40',
        ]);

        $response = $this->get('/orders?search=203.0.113.77');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
                ->where('orders.data.0.customer_email', 'analyst-match@example.com')
            );
    }

    public function test_dashboard_can_filter_undecided_orders(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 82.4,
            'decision_status' => null,
        ]);

        Order::factory()->create([
            'risk_score' => 85.0,
            'decision_status' => 'blocked',
        ]);

        $response = $this->get('/orders?decision=undecided');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
                ->where('orders.data.0.decision_status', null)
            );
    }

    public function test_dashboard_can_filter_cross_border_orders_from_quick_filters(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 78.0,
            'risk_signals' => [
                ['key' => 'country_mismatch', 'label' => 'Billing/shipping country mismatch (UNITED KINGDOM vs ROMANIA)', 'points' => 34],
            ],
        ]);

        Order::factory()->create([
            'risk_score' => 12.5,
            'risk_signals' => [],
        ]);

        $response = $this->get('/orders?quick=cross_border');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
                ->where('orders.data.0.risk_signals.0.key', 'country_mismatch')
            );
    }

    public function test_dashboard_can_filter_pending_decision_orders_from_quick_filters(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 84.0,
            'decision_status' => null,
        ]);

        Order::factory()->create([
            'risk_score' => 84.0,
            'decision_status' => 'approved',
        ]);

        $response = $this->get('/orders?quick=pending_decision');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
                ->where('orders.data.0.decision_status', null)
            );
    }

    public function test_dashboard_can_filter_by_risk_band(): void
    {
        Queue::fake();

        Order::factory()->create([
            'risk_score' => 22.0,
        ]);

        Order::factory()->create([
            'risk_score' => 66.5,
        ]);

        Order::factory()->create([
            'risk_score' => 92.0,
        ]);

        $response = $this->get('/orders?risk=high');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 1)
                ->where('orders.data.0.risk_score', 92)
            );
    }

    public function test_dashboard_starts_empty_without_seeded_orders(): void
    {
        Queue::fake();

        $response = $this->get('/orders');

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('orders/dashboard')
                ->where('stats.total_orders', 0)
                ->where('orders.data', fn (Collection $orders): bool => $orders->count() === 0)
            );
    }
}
