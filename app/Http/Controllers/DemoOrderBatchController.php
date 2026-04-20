<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreDemoOrdersRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;

final class DemoOrderBatchController extends Controller
{
    public function store(StoreDemoOrdersRequest $request): RedirectResponse
    {
        $count = (int) $request->integer('count');
        $flaggedCount = max(2, (int) round($count * 0.3));
        $safeCount = max(1, $count - $flaggedCount);
        $sharedIps = collect([
            '198.51.100.10',
            '198.51.100.11',
            '198.51.100.12',
            '198.51.100.13',
            '198.51.100.14',
        ]);

        Order::factory()->count($safeCount)->safe()->create();

        Collection::times($flaggedCount, function (int $index) use ($flaggedCount, $sharedIps): void {
            $sharedIp = $sharedIps[($index - 1) % $sharedIps->count()];

            Order::factory()
                ->risky($sharedIp)
                ->create([
                    'created_at' => now()->subSeconds($flaggedCount - $index),
                    'updated_at' => now()->subSeconds($flaggedCount - $index),
                ]);
        });

        return redirect()
            ->route('orders.index')
            ->with(
                'status',
                sprintf(
                    'Queued %d demo orders for triage (%d expected clear, %d expected review).',
                    $count,
                    $safeCount,
                    $flaggedCount,
                ),
            );
    }
}
