<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessOrderTriage;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class ProcessOrderTriageTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_updates_low_risk_orders_without_calling_ai(): void
    {
        Queue::fake();
        Http::fake();

        $order = Order::factory()->create([
            'customer_email' => 'buyer@example.com',
            'total_amount' => 99.99,
            'billing_address' => '10 Downing Street, London, United Kingdom',
            'shipping_address' => '10 Downing Street, London, United Kingdom',
        ]);

        app()->call([new ProcessOrderTriage($order->id), 'handle']);

        $order->refresh();

        $this->assertSame(0.0, $order->risk_score);
        $this->assertNull($order->ai_investigation_note);
        Http::assertNothingSent();
    }

    public function test_job_enriches_high_risk_orders_with_openrouter_note(): void
    {
        Queue::fake();

        Config::set('services.openrouter.api_key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4.1-mini');

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '{"risk_score":91,"investigation_note":"The order shows a country mismatch, elevated value, and repeat IP activity that merits review."}',
                        ],
                    ],
                ],
            ]),
        ]);

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

        $this->assertSame(91.0, $order->risk_score);
        $this->assertSame(
            'The order shows a country mismatch, elevated value, and repeat IP activity that merits review.',
            $order->ai_investigation_note,
        );
    }
}
