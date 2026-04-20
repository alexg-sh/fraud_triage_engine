<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class ResetDemoDataController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        DB::transaction(function (): void {
            DB::table('jobs')->delete();
            DB::table('failed_jobs')->delete();
            DB::table('job_batches')->delete();
            DB::table('orders')->delete();
        });

        Cache::forget('demo_queue.total_runs');
        Cache::forget('demo_queue.last_run');

        return redirect()
            ->route('orders.index')
            ->with('status', 'Demo data reset. Orders and queued jobs cleared.');
    }
}
