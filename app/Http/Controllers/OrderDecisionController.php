<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderDecisionRequest;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

final class OrderDecisionController extends Controller
{
    public function __invoke(StoreOrderDecisionRequest $request, Order $order): JsonResponse
    {
        $order->forceFill([
            'decision_status' => $request->string('decision_status')->value(),
            'decision_note' => $request->filled('decision_note')
                ? trim((string) $request->input('decision_note'))
                : null,
            'decisioned_at' => now(),
        ])->save();

        return response()->json([
            'data' => [
                'id' => $order->id,
                'decision_status' => $order->decision_status,
                'decision_note' => $order->decision_note,
                'decisioned_at' => optional($order->decisioned_at)?->toIso8601String(),
            ],
        ]);
    }
}
