<?php

declare(strict_types=1);

namespace App\Services;

use App\DataTransferObjects\OrderRiskProfile;
use App\DataTransferObjects\RiskAnalysisResult;
use App\Models\Order;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class OpenRouterRiskAnalyzer
{
    public function __construct(
        private readonly HttpFactory $http,
    ) {
    }

    public function analyze(Order $order, OrderRiskProfile $profile): RiskAnalysisResult
    {
        $apiKey = (string) config('services.openrouter.api_key');

        if ($apiKey === '') {
            return new RiskAnalysisResult(
                riskScore: $profile->score,
                investigationNote: $this->buildFallbackNote($profile, 'OpenRouter is not configured'),
            );
        }

        try {
            $response = $this->http
                ->baseUrl((string) config('services.openrouter.base_url'))
                ->timeout((int) config('services.openrouter.timeout'))
                ->withHeaders([
                    'Authorization' => 'Bearer '.$apiKey,
                    'HTTP-Referer' => (string) config('services.openrouter.site_url'),
                    'X-Title' => (string) config('services.openrouter.site_name'),
                ])
                ->acceptJson()
                ->post('/chat/completions', [
                    'model' => (string) config('services.openrouter.model'),
                    'max_tokens' => (int) config('services.openrouter.max_tokens'),
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a fraud analyst. Return strict JSON with keys risk_score and investigation_note. risk_score must be a number from 0 to 100. investigation_note must be one sentence.',
                        ],
                        [
                            'role' => 'user',
                            'content' => json_encode([
                                'order_id' => $order->id,
                                'customer_email' => $order->customer_email,
                                'total_amount' => (float) $order->total_amount,
                                'ip_address' => $order->ip_address,
                                'billing_address' => $order->billing_address,
                                'shipping_address' => $order->shipping_address,
                                'heuristic_score' => $profile->score,
                                'signals' => $profile->signals,
                                'metadata' => $profile->metadata,
                            ], JSON_THROW_ON_ERROR),
                        ],
                    ],
                ])
                ->throw();
        } catch (RequestException|ConnectionException $exception) {
            $failureReason = $this->buildFailureReason($exception);

            Log::warning('OpenRouter risk analysis failed.', [
                'order_id' => $order->id,
                'model' => (string) config('services.openrouter.model'),
                'exception' => $exception::class,
                'reason' => $failureReason,
                'heuristic_score' => $profile->score,
                'signals' => $profile->signals,
            ]);

            return new RiskAnalysisResult(
                riskScore: $profile->score,
                investigationNote: $this->buildFallbackNote($profile, $failureReason),
            );
        }

        $content = Arr::get($response->json(), 'choices.0.message.content', '');
        $payload = $this->decodeContent(is_string($content) ? $content : '');

        $riskScore = (float) Arr::get($payload, 'risk_score', $profile->score);
        $note = (string) Arr::get($payload, 'investigation_note', '');

        $normalizedNote = $this->normalizeSentence($note);

        if ($normalizedNote === '') {
            $normalizedNote = 'High-risk order requires manual review due to multiple fraud indicators.';
        }

        return new RiskAnalysisResult(
            riskScore: max(0.0, min(100.0, $riskScore)),
            investigationNote: $normalizedNote,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeContent(string $content): array
    {
        $decoded = json_decode($content, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $content, $matches) !== 1) {
            return [];
        }

        $decoded = json_decode($matches[0], true);

        return is_array($decoded) ? $decoded : [];
    }

    private function normalizeSentence(string $note): string
    {
        $note = trim(preg_replace('/\s+/', ' ', strip_tags($note)) ?? '');

        if ($note === '') {
            return '';
        }

        $note = Str::of($note)->trim()->finish('.')->value();
        $parts = preg_split('/(?<=[.!?])\s+/', $note);

        return trim((string) ($parts[0] ?? $note));
    }

    private function buildFallbackNote(OrderRiskProfile $profile, string $status): string
    {
        $signals = array_values(array_filter(array_map(
            static fn (array $signal): string => trim(rtrim((string) ($signal['label'] ?? ''), '.')),
            $profile->signals,
        )));

        if ($signals === []) {
            return sprintf('Manual review required due to multiple fraud indicators; %s.', $status);
        }

        $summary = lcfirst($this->joinSignals(array_slice($signals, 0, 3)));

        return sprintf('Manual review required due to %s; %s.', $summary, $status);
    }

    private function buildFailureReason(RequestException|ConnectionException $exception): string
    {
        if ($exception instanceof RequestException) {
            $status = $exception->response->status();
            $message = Arr::get($exception->response->json(), 'error.message')
                ?? Arr::get($exception->response->json(), 'message');

            if (is_string($message) && $message !== '') {
                return sprintf('AI analysis failed with HTTP %d: %s', $status, $this->normalizeFragment($message));
            }

            return sprintf('AI analysis failed with HTTP %d', $status);
        }

        return sprintf(
            'AI analysis failed: %s',
            $this->normalizeFragment($exception->getMessage())
        );
    }

    /**
     * @param list<string> $signals
     */
    private function joinSignals(array $signals): string
    {
        if (count($signals) === 1) {
            return $signals[0];
        }

        if (count($signals) === 2) {
            return sprintf('%s and %s', $signals[0], $signals[1]);
        }

        $lastSignal = array_pop($signals);

        return sprintf('%s, and %s', implode(', ', $signals), $lastSignal);
    }

    private function normalizeFragment(string $value): string
    {
        return trim((string) Str::of($value)
            ->replaceMatches('/\s+/', ' ')
            ->trim(" \t\n\r\0\x0B."));
    }
}
