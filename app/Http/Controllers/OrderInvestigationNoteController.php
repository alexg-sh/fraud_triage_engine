<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OpenRouterRiskAnalyzer;
use App\Services\OrderRiskScorer;
use Illuminate\Http\JsonResponse;

final class OrderInvestigationNoteController extends Controller
{
    public function __invoke(
        Order $order,
        OrderRiskScorer $scorer,
        OpenRouterRiskAnalyzer $analyzer,
    ): JsonResponse {
        $profile = $scorer->score($order);

        $order->forceFill([
            'risk_score' => $profile->score,
        ])->save();

        if (! $profile->shouldEscalate()) {
            $order->forceFill([
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

        if ($order->ai_investigation_note !== null) {
            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => (float) $order->risk_score,
                    'requires_review' => true,
                    'ai_investigation_note' => $order->ai_investigation_note,
                ],
            ]);
        }

        $analysis = $analyzer->analyze($order, $profile);

        $order->forceFill([
            'risk_score' => $analysis->riskScore,
            'ai_investigation_note' => $analysis->investigationNote,
        ])->save();

        return response()->json([
            'data' => [
                'id' => $order->id,
                'risk_score' => $analysis->riskScore,
                'requires_review' => true,
                'ai_investigation_note' => $analysis->investigationNote,
            ],
        ]);
    }
}
