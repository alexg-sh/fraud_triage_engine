<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\DataTransferObjects\OrderRiskProfile;
use App\Services\OpenRouterRiskAnalyzer;
use Database\Factories\OrderFactory;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class OpenRouterRiskAnalyzerTest extends TestCase
{
    public function test_service_parses_json_response_and_normalizes_note(): void
    {
        Config::set('services.openrouter.api_key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4.1-mini');

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

        $profile = new OrderRiskProfile(65.0, ['Country mismatch'], ['recent_same_ip_orders' => 4]);

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        $this->assertSame(88.0, $result->riskScore);
        $this->assertSame(
            'The repeated IP pattern and address mismatch point to coordinated card testing.',
            $result->investigationNote,
        );
    }

    public function test_service_falls_back_when_request_fails(): void
    {
        Config::set('services.openrouter.api_key', 'test-key');

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([], 500),
        ]);

        $order = OrderFactory::new()->make(['id' => 777]);
        $profile = new OrderRiskProfile(55.0, ['High amount'], ['amount' => 2499.99]);

        $result = app(OpenRouterRiskAnalyzer::class)->analyze($order, $profile);

        $this->assertSame(55.0, $result->riskScore);
        $this->assertSame(
            'High-risk order requires manual review; AI analysis is temporarily unavailable.',
            $result->investigationNote,
        );
    }
}
