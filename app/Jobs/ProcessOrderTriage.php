<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Order;
use App\Services\OpenRouterRiskAnalyzer;
use App\Services\OrderRiskScorer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class ProcessOrderTriage implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 60;

    public function __construct(
        public readonly int $orderId,
    ) {
        $this->queue = 'triage';
    }

    public function handle(OrderRiskScorer $scorer, OpenRouterRiskAnalyzer $analyzer): void
    {
        $order = Order::query()->find($this->orderId);

        if ($order === null) {
            return;
        }

        $delayMs = app()->isLocal() ? (int) env('TRIAGE_JOB_DELAY_MS', 150) : 0;

        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }

        $profile = $scorer->score($order);

        if (! $profile->shouldEscalate()) {
            $order->forceFill([
                'risk_score' => $profile->score,
                'risk_signals' => $profile->signals,
                'ai_investigation_note' => null,
            ])->save();

            return;
        }

        $analysis = $analyzer->analyze($order, $profile);

        $order->forceFill([
            'risk_score' => $analysis->riskScore,
            'risk_signals' => $profile->signals,
            'ai_investigation_note' => $analysis->investigationNote,
        ])->save();
    }
}
