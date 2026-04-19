<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

final class OrderController extends Controller
{
    public function store(StoreOrderRequest $request): JsonResponse|RedirectResponse
    {
        $order = Order::create($request->validated());

        if ($request->expectsJson()) {
            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => $order->risk_score,
                ],
            ], 201);
        }

        return redirect()
            ->route('orders.index')
            ->with('status', 'Order queued for triage.');
    }
}
