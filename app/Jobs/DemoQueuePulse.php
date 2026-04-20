<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class DemoQueuePulse implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(
        public readonly string $reference,
    ) {
        $this->queue = 'default';
    }

    public function handle(): void
    {
        usleep(750_000);

        if (! Cache::has('demo_queue.total_runs')) {
            Cache::forever('demo_queue.total_runs', 0);
        }

        $totalRuns = (int) Cache::increment('demo_queue.total_runs');
        $lastRun = [
            'reference' => $this->reference,
            'queue' => $this->queue,
            'completed_at' => now()->toIso8601String(),
            'total_runs' => $totalRuns,
        ];

        Cache::forever('demo_queue.last_run', $lastRun);

        Log::info('Demo queue job completed.', $lastRun);
    }
}
