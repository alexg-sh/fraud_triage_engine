<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderInvestigationNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_controller_returns_persisted_note_without_regenerating_it(): void
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
            'risk_score' => 91.0,
            'ai_investigation_note' => 'The order shows a country mismatch, elevated value, and repeat IP activity that merits review.',
            'risk_signals' => [
                ['key' => 'country_mismatch', 'label' => 'Billing/shipping country mismatch (UNITED KINGDOM vs ROMANIA)', 'points' => 34],
                ['key' => 'high_basket', 'label' => 'High basket value exceeds GBP 2,000', 'points' => 16],
                ['key' => 'shared_ip', 'label' => 'High order frequency from shared IP (3 recent)', 'points' => 14],
                ['key' => 'disposable_email', 'label' => 'Disposable or suspicious email domain', 'points' => 8],
            ],
        ]);

        Http::fake();

        $response = $this->postJson("/orders/{$order->id}/investigation-note");

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.requires_review', true)
            ->assertJsonPath(
                'data.ai_investigation_note',
                'The order shows a country mismatch, elevated value, and repeat IP activity that merits review.',
            );

        Http::assertNothingSent();
    }

    public function test_low_risk_order_returns_without_triggering_ai(): void
    {
        Queue::fake();
        Http::fake();

        $order = Order::factory()->create([
            'customer_email' => 'buyer@example.com',
            'total_amount' => 99.99,
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '10 Downing Street, London, United Kingdom',
            'risk_score' => 0.0,
            'ai_investigation_note' => null,
        ]);

        $response = $this->postJson("/orders/{$order->id}/investigation-note");

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.requires_review', false)
            ->assertJsonPath('data.ai_investigation_note', null);

        Http::assertNothingSent();
        $this->assertSame([], $order->fresh()->risk_signals);
    }

    public function test_note_can_be_refreshed_on_request(): void
    {
        Queue::fake();

        Config::set('services.openrouter.api_key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4.1-mini');

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '{"risk_score":93,"investigation_note":"The refreshed summary confirms a cross-border high-value order with repeated IP activity."}',
                        ],
                    ],
                ],
            ]),
        ]);

        Order::factory()->count(3)->create([
            'ip_address' => '203.0.113.99',
            'created_at' => now()->subMinutes(10),
            'updated_at' => now()->subMinutes(10),
        ]);

        $order = Order::factory()->create([
            'customer_email' => 'watchlist@maildrop.cc',
            'ip_address' => '203.0.113.99',
            'total_amount' => 2450.00,
            'billing_address' => '221B Baker Street, London, United Kingdom',
            'shipping_address' => '1 Courier Way, Bucharest, Romania',
            'risk_score' => 72.0,
            'ai_investigation_note' => 'Stale fallback note.',
            'risk_signals' => [
                ['key' => 'country_mismatch', 'label' => 'Billing/shipping country mismatch (UNITED KINGDOM vs ROMANIA)', 'points' => 34],
                ['key' => 'high_basket', 'label' => 'High basket value exceeds GBP 2,000', 'points' => 16],
            ],
        ]);

        $response = $this
            ->postJson("/orders/{$order->id}/investigation-note", [
                'refresh' => true,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.risk_score', 93)
            ->assertJsonPath(
                'data.ai_investigation_note',
                'The refreshed summary confirms a cross-border high-value order with repeated IP activity.',
            );

        $order->refresh();

        $this->assertSame(93.0, $order->risk_score);
        $this->assertSame([
            ['key' => 'country_mismatch', 'label' => 'Billing/shipping country mismatch (UNITED KINGDOM vs ROMANIA)', 'points' => 34],
            ['key' => 'high_basket', 'label' => 'High basket value exceeds GBP 2,000', 'points' => 16],
            ['key' => 'shared_ip', 'label' => 'High order frequency from shared IP (3 recent)', 'points' => 14],
            ['key' => 'disposable_email', 'label' => 'Disposable or suspicious email domain', 'points' => 8],
        ], $order->risk_signals);
        $this->assertSame(
            'The refreshed summary confirms a cross-border high-value order with repeated IP activity.',
            $order->ai_investigation_note,
        );
    }
}
