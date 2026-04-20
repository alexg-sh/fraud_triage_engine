<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OpenRouterRiskAnalyzer;
use App\Services\OrderRiskScorer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrderInvestigationNoteController extends Controller
{
    public function __invoke(
        Request $request,
        Order $order,
        OrderRiskScorer $scorer,
        OpenRouterRiskAnalyzer $analyzer,
    ): JsonResponse {
        $refresh = $request->boolean('refresh');

        if (! $refresh) {
            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => (float) $order->risk_score,
                    'requires_review' => $order->requiresReview(),
                    'ai_investigation_note' => $order->ai_investigation_note,
                ],
            ]);
        }

        $profile = $scorer->score($order);

        if (! $profile->shouldEscalate()) {
            $order->forceFill([
                'risk_score' => $profile->score,
                'risk_signals' => $profile->signals,
                'ai_investigation_note' => null,
            ])->save();

            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => $profile->score,
                    'requires_review' => false,
                    'ai_investigation_note' => null,
                ],
            ]);
        }

        $analysis = $analyzer->analyze($order, $profile);

        $order->forceFill([
            'risk_score' => $analysis->riskScore,
            'risk_signals' => $profile->signals,
            'ai_investigation_note' => $analysis->investigationNote,
        ])->save();

        return response()->json([
            'data' => [
                'id' => $order->id,
                'risk_score' => $analysis->riskScore,
                'requires_review' => true,
                'ai_investigation_note' => $order->ai_investigation_note,
            ],
        ]);
    }
}
