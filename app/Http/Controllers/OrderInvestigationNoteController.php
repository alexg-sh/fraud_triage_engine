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
    private const SESSION_NOTES_KEY = 'order_investigation_notes';

    public function __invoke(
        Request $request,
        Order $order,
        OrderRiskScorer $scorer,
        OpenRouterRiskAnalyzer $analyzer,
    ): JsonResponse {
        $refresh = $request->boolean('refresh');
        /** @var array<int, array{note?: string, risk_score?: float|int}> $sessionNotes */
        $sessionNotes = $request->session()->get(self::SESSION_NOTES_KEY, []);
        $profile = $scorer->score($order);

        $order->forceFill([
            'risk_score' => $profile->score,
            'risk_signals' => $profile->signals,
        ])->save();

        if (! $profile->shouldEscalate()) {
            unset($sessionNotes[$order->id]);
            $request->session()->put(self::SESSION_NOTES_KEY, $sessionNotes);

            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => $profile->score,
                    'requires_review' => false,
                    'ai_investigation_note' => null,
                ],
            ]);
        }

        $cachedNote = $sessionNotes[$order->id]['note'] ?? null;

        if (
            ! $refresh
            && is_string($cachedNote)
            && trim($cachedNote) !== ''
        ) {
            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'risk_score' => (float) $order->risk_score,
                    'requires_review' => true,
                    'ai_investigation_note' => $cachedNote,
                ],
            ]);
        }

        $analysis = $analyzer->analyze($order, $profile);

        $order->forceFill([
            'risk_score' => $analysis->riskScore,
            'risk_signals' => $profile->signals,
        ])->save();

        $sessionNotes[$order->id] = [
            'note' => $analysis->investigationNote,
            'risk_score' => $analysis->riskScore,
        ];
        $request->session()->put(self::SESSION_NOTES_KEY, $sessionNotes);

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
