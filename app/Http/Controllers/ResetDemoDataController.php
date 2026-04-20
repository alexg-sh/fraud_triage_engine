<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class ResetDemoDataController extends Controller
{
    private const SESSION_NOTES_KEY = 'order_investigation_notes';

    public function __invoke(Request $request): RedirectResponse
    {
        DB::transaction(function (): void {
            DB::table('jobs')->delete();
            DB::table('failed_jobs')->delete();
            DB::table('job_batches')->delete();
            DB::table('orders')->delete();
        });

        Cache::forget('demo_queue.total_runs');
        Cache::forget('demo_queue.last_run');
        $request->session()->forget(self::SESSION_NOTES_KEY);

        return redirect()
            ->route('orders.index')
            ->with('status', 'Demo data reset. Orders and queued jobs cleared.');
    }
}
