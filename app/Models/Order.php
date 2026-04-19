<?php

declare(strict_types=1);

namespace App\Models;

use App\Jobs\ProcessOrderTriage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'customer_email',
        'total_amount',
        'ip_address',
        'billing_address',
        'shipping_address',
        'risk_score',
        'ai_investigation_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'risk_score' => 'float',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (self $order): void {
            ProcessOrderTriage::dispatch($order->id)->onQueue('triage');
        });
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->latest('created_at');
    }

    public function requiresReview(): bool
    {
        return $this->risk_score >= 50.0;
    }
}
