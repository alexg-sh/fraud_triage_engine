<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class OrderDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $ordersQuery = Order::query();

        if ($request->string('filter')->value() === 'review') {
            $ordersQuery->where('risk_score', '>=', 50);
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
                'ai_investigation_note' => $order->ai_investigation_note,
                'requires_review' => $order->requiresReview(),
                'created_at' => optional($order->created_at)?->toIso8601String(),
            ]);

        return Inertia::render('orders/dashboard', [
            'orders' => $orders,
            'stats' => [
                'total_orders' => Order::query()->count(),
                'review_orders' => Order::query()->where('risk_score', '>=', 50)->count(),
                'average_risk_score' => round(Order::query()->avg('risk_score') ?? 0, 1),
                'highest_risk_score' => round(Order::query()->max('risk_score') ?? 0, 1),
            ],
        ]);
    }
}
