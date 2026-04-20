<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\DemoQueuePulse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

final class DemoQueueJobController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        DemoQueuePulse::dispatch(Str::upper(Str::random(6)))->onQueue('default');

        return redirect()
            ->route('queue.monitor')
            ->with('status', 'Demo job queued on `default`.');
    }
}
