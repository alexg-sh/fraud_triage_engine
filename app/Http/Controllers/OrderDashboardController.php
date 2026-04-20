<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderRiskScorer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class OrderDashboardController extends Controller
{
    public function __invoke(Request $request, OrderRiskScorer $scorer): Response
    {
        $ordersQuery = Order::query();
        $search = trim($request->string('search')->value());
        $decision = $request->string('decision')->value();
        $risk = $request->string('risk')->value();
        $quickFilter = $request->string('quick')->value();

        if ($request->string('filter')->value() === 'review') {
            $ordersQuery->where('risk_score', '>=', 50);
        }

        if ($search !== '') {
            $searchTerm = sprintf('%%%s%%', $search);

            $ordersQuery->where(function ($query) use ($searchTerm): void {
                $query
                    ->where('customer_email', 'like', $searchTerm)
                    ->orWhere('ip_address', 'like', $searchTerm)
                    ->orWhere('billing_address', 'like', $searchTerm)
                    ->orWhere('shipping_address', 'like', $searchTerm);
            });
        }

        if ($decision !== '') {
            if ($decision === 'undecided') {
                $ordersQuery->whereNull('decision_status');
            } elseif (in_array($decision, ['approved', 'blocked', 'escalated'], true)) {
                $ordersQuery->where('decision_status', $decision);
            }
        }

        if ($risk !== '') {
            match ($risk) {
                'high' => $ordersQuery->where('risk_score', '>=', 80),
                'medium' => $ordersQuery->where('risk_score', '>=', 50)->where('risk_score', '<', 80),
                'low' => $ordersQuery->where('risk_score', '<', 50),
                default => null,
            };
        }

        if ($quickFilter !== '') {
            match ($quickFilter) {
                'high_value' => $ordersQuery->where('total_amount', '>', 2000),
                'shared_ip' => $ordersQuery
                    ->where(function ($query): void {
                        $query
                            ->where('risk_signals', 'like', '%"shared_ip"%')
                            ->orWhere('risk_signals', 'like', '%High order frequency from shared IP%');
                    }),
                'cross_border' => $ordersQuery
                    ->where(function ($query): void {
                        $query
                            ->where('risk_signals', 'like', '%"country_mismatch"%')
                            ->orWhere('risk_signals', 'like', '%Billing\\/shipping country mismatch%')
                            ->orWhere('risk_signals', 'like', '%Billing/shipping country mismatch%');
                    }),
                'ai_note_requested' => $ordersQuery->whereNotNull('ai_investigation_note'),
                'pending_decision' => $ordersQuery->where('risk_score', '>=', 50)->whereNull('decision_status'),
                default => null,
            };
        }

        $orders = $ordersQuery
            ->latestFirst()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'customer_email' => $order->customer_email,
                'total_amount' => (float) $order->total_amount,
                'ip_address' => $order->ip_address,
                'billing_address' => $order->billing_address,
                'shipping_address' => $order->shipping_address,
                'risk_score' => round($order->risk_score, 1),
                'risk_signals' => $this->normalizeRiskSignals($order, $scorer),
                'ai_investigation_note' => $order->ai_investigation_note,
                'requires_review' => $order->requiresReview(),
                'decision_status' => $order->decision_status,
                'decision_note' => $order->decision_note,
                'decisioned_at' => optional($order->decisioned_at)?->toIso8601String(),
                'created_at' => optional($order->created_at)?->toIso8601String(),
            ]);

        return Inertia::render('orders/dashboard', [
            'orders' => $orders,
            'stats' => [
                'total_orders' => Order::query()->count(),
                'review_orders' => Order::query()->where('risk_score', '>=', 50)->count(),
                'average_risk_score' => round(Order::query()->avg('risk_score') ?? 0, 1),
                'highest_risk_score' => round(Order::query()->max('risk_score') ?? 0, 1),
                'undecided_review_orders' => Order::query()
                    ->where('risk_score', '>=', 50)
                    ->whereNull('decision_status')
                    ->count(),
            ],
        ]);
    }

    /**
     * @return list<array{key: string, label: string, points: int}>
     */
    private function normalizeRiskSignals(Order $order, OrderRiskScorer $scorer): array
    {
        $rawSignals = $order->risk_signals ?? [];

        if ($rawSignals === []) {
            return [];
        }

        $normalized = [];

        foreach ($rawSignals as $signal) {
            if (
                is_array($signal)
                && isset($signal['key'], $signal['label'], $signal['points'])
                && is_string($signal['key'])
                && is_string($signal['label'])
                && is_numeric($signal['points'])
            ) {
                $normalized[] = [
                    'key' => $signal['key'],
                    'label' => $signal['label'],
                    'points' => (int) $signal['points'],
                ];
            }
        }

        if ($normalized !== []) {
            return $normalized;
        }

        return $scorer->score($order)->signals;
    }
}
