<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Order;
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

    public function handle(OrderRiskScorer $scorer): void
    {
        $order = Order::query()->find($this->orderId);

        if ($order === null) {
            return;
        }

        $profile = $scorer->score($order);

        $order->forceFill([
            'risk_score' => $profile->score,
            // AI notes are generated on demand when an analyst opens the order.
            'ai_investigation_note' => null,
        ])->save();
    }
}
