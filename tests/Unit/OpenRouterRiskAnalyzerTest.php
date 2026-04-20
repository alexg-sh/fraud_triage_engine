<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\DataTransferObjects\OrderRiskProfile;
use App\Services\OpenRouterRiskAnalyzer;
use Database\Factories\OrderFactory;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

final class OpenRouterRiskAnalyzerTest extends TestCase
{
    public function test_service_parses_json_response_and_normalizes_note(): void
    {
        Config::set('services.openrouter.api_key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4.1-mini');
        Config::set('services.openrouter.max_tokens', 180);

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '{"risk_score":88,"investigation_note":"The repeated IP pattern and address mismatch point to coordinated card testing."}',
                        ],
                    ],
                ],
            ]),
        ]);

        $order = OrderFactory::new()->make([
            'id' => 501,
            'customer_email' => 'risk@example.com',
        ]);

        $profile = new OrderRiskProfile(65.0, [
            ['key' => 'country_mismatch', 'label' => 'Country mismatch', 'points' => 34],
        ], ['recent_same_ip_orders' => 4]);

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        Http::assertSent(function (\Illuminate\Http\Client\Request $request): bool {
            return $request['model'] === 'openai/gpt-4.1-mini'
                && $request['max_tokens'] === 180
                && $request['response_format']['type'] === 'json_object';
        });

        $this->assertSame(88.0, $result->riskScore);
        $this->assertSame(
            'The repeated IP pattern and address mismatch point to coordinated card testing.',
            $result->investigationNote,
        );
    }

    public function test_service_falls_back_when_request_fails(): void
    {
        Config::set('services.openrouter.api_key', 'test-key');
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'OpenRouter risk analysis failed.'
                    && $context['order_id'] === 777
                    && $context['reason'] === 'AI analysis failed with HTTP 500: Upstream timeout from provider';
            });

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([
                'error' => [
                    'message' => 'Upstream timeout from provider',
                ],
            ], 500),
        ]);

        $order = OrderFactory::new()->make(['id' => 777]);
        $profile = new OrderRiskProfile(55.0, [
            ['key' => 'high_basket', 'label' => 'High amount', 'points' => 16],
        ], ['amount' => 2499.99]);

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        $this->assertSame(55.0, $result->riskScore);
        $this->assertSame(
            'Manual review required due to high amount; AI analysis failed with HTTP 500: Upstream timeout from provider.',
            $result->investigationNote,
        );
    }

    public function test_service_falls_back_with_signal_summary_when_api_key_is_missing(): void
    {
        Config::set('services.openrouter.api_key', '');

        $order = OrderFactory::new()->make(['id' => 778]);
        $profile = new OrderRiskProfile(
            85.0,
            [
                ['key' => 'country_mismatch', 'label' => 'Billing/shipping country mismatch (UK vs RO)', 'points' => 34],
                ['key' => 'high_basket', 'label' => 'High basket value exceeds GBP 2,000', 'points' => 22],
            ],
            ['amount' => 2750.00],
        );

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        $this->assertSame(85.0, $result->riskScore);
        $this->assertSame(
            'Manual review required due to billing/shipping country mismatch (UK vs RO) and High basket value exceeds GBP 2,000; OpenRouter is not configured.',
            $result->investigationNote,
        );
    }

    public function test_service_falls_back_with_connection_reason(): void
    {
        Config::set('services.openrouter.api_key', 'test-key');
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'OpenRouter risk analysis failed.'
                    && $context['order_id'] === 779
                    && $context['reason'] === 'AI analysis failed: cURL error 6: Could not resolve host: openrouter.ai';
            });

        Http::fake(function (): never {
            throw new \Illuminate\Http\Client\ConnectionException('cURL error 6: Could not resolve host: openrouter.ai');
        });

        $order = OrderFactory::new()->make(['id' => 779]);
        $profile = new OrderRiskProfile(75.0, [
            ['key' => 'country_mismatch', 'label' => 'Country mismatch', 'points' => 34],
        ], ['recent_same_ip_orders' => 4]);

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        $this->assertSame(75.0, $result->riskScore);
        $this->assertSame(
            'Manual review required due to country mismatch; AI analysis failed: cURL error 6: Could not resolve host: openrouter.ai.',
            $result->investigationNote,
        );
    }
}
