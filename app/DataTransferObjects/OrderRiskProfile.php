<?php

declare(strict_types=1);

namespace App\DataTransferObjects;

final readonly class OrderRiskProfile
{
    /**
     * @param list<array{key: string, label: string, points: int}> $signals
     * @param array<string, scalar> $metadata
     */
    public function __construct(
        public float $score,
        public array $signals,
        public array $metadata,
    ) {
    }

    public function shouldEscalate(float $threshold = 50.0): bool
    {
        return $this->score >= $threshold;
    }
}
