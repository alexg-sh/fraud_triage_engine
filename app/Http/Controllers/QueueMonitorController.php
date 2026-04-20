<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class QueueMonitorController extends Controller
{
    public function __invoke(): Response
    {
        $pendingJobs = DB::table('jobs')
            ->orderByDesc('id')
            ->get(['id', 'queue', 'attempts', 'reserved_at', 'available_at', 'created_at'])
            ->map(fn (object $job): array => [
                'id' => $job->id,
                'queue' => $job->queue,
                'attempts' => $job->attempts,
                'reserved_at' => $job->reserved_at,
                'available_at' => $job->available_at,
                'created_at' => $job->created_at,
            ]);

        $failedJobs = DB::table('failed_jobs')
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'queue', 'failed_at', 'exception'])
            ->map(fn (object $job): array => [
                'id' => $job->id,
                'queue' => $job->queue,
                'failed_at' => $job->failed_at,
                'exception' => str($job->exception)->limit(220)->value(),
            ]);

        $recentTriagedOrders = Order::query()
            ->where(function ($query): void {
                $query->where('risk_score', '>', 0)
                    ->orWhereNotNull('ai_investigation_note');
            })
            ->latest('updated_at')
            ->limit(12)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'customer_email' => $order->customer_email,
                'risk_score' => round($order->risk_score, 1),
                'requires_review' => $order->requiresReview(),
                'ai_investigation_note' => $order->ai_investigation_note,
                'updated_at' => optional($order->updated_at)?->toIso8601String(),
            ]);

        return Inertia::render('ops/queue-monitor', [
            'stats' => [
                'pending_jobs' => $pendingJobs->count(),
                'failed_jobs' => DB::table('failed_jobs')->count(),
                'review_orders' => Order::query()->where('risk_score', '>=', 50)->count(),
                'triaged_orders' => Order::query()
                    ->where(function ($query): void {
                        $query->where('risk_score', '>', 0)
                            ->orWhereNotNull('ai_investigation_note');
                    })
                    ->count(),
            ],
            'pendingJobs' => $pendingJobs->values(),
            'failedJobs' => $failedJobs->values(),
            'recentTriagedOrders' => $recentTriagedOrders->values(),
            'runtime' => [
                'queue_connection' => (string) config('queue.default'),
                'horizon_available' => extension_loaded('redis'),
            ],
        ]);
    }
}
