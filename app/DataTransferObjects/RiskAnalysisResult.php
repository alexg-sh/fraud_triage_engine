<?php

declare(strict_types=1);

namespace App\DataTransferObjects;

final readonly class RiskAnalysisResult
{
    public function __construct(
        public float $riskScore,
        public string $investigationNote,
    ) {
    }
}
