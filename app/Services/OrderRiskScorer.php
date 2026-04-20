<?php

declare(strict_types=1);

namespace App\Services;

use App\DataTransferObjects\OrderRiskProfile;
use App\Models\Order;
use Illuminate\Support\Str;

final class OrderRiskScorer
{
    public function score(Order $order): OrderRiskProfile
    {
        $signals = [];
        $score = 0.0;
        $amount = (float) $order->total_amount;

        $billingCountry = $this->extractCountry($order->billing_address);
        $shippingCountry = $this->extractCountry($order->shipping_address);

        if ($billingCountry !== null && $shippingCountry !== null && $billingCountry !== $shippingCountry) {
            $score += 34;
            $signals[] = sprintf('Billing/shipping country mismatch (%s vs %s)', $billingCountry, $shippingCountry);
        }

        $basketValueScore = $this->basketValueScore($amount);

        if ($basketValueScore > 0) {
            $score += $basketValueScore;
            $signals[] = 'High basket value exceeds GBP 2,000';
        }

        $recentSameIpOrders = Order::query()
            ->where('ip_address', $order->ip_address)
            ->whereKeyNot($order->id)
            ->where('created_at', '>=', ($order->created_at ?? now())->copy()->subDay())
            ->count();

        $sharedIpScore = $this->sharedIpScore($recentSameIpOrders);

        if ($sharedIpScore > 0) {
            $score += $sharedIpScore;
            $signals[] = sprintf('High order frequency from shared IP (%d recent)', $recentSameIpOrders);
        }

        if ($this->looksDisposableEmail($order->customer_email)) {
            $score += 8;
            $signals[] = 'Disposable or suspicious email domain';
        }

        return new OrderRiskProfile(
            score: max(0.0, min(100.0, $score)),
            signals: $signals,
            metadata: [
                'recent_same_ip_orders' => $recentSameIpOrders,
                'billing_country' => $billingCountry ?? 'unknown',
                'shipping_country' => $shippingCountry ?? 'unknown',
                'amount' => $amount,
            ],
        );
    }

    private function basketValueScore(float $amount): float
    {
        return match (true) {
            $amount > 3500.0 => 28.0,
            $amount > 2500.0 => 22.0,
            $amount > 2000.0 => 16.0,
            default => 0.0,
        };
    }

    private function sharedIpScore(int $recentSameIpOrders): float
    {
        return match (true) {
            $recentSameIpOrders >= 5 => 20.0,
            $recentSameIpOrders >= 3 => 14.0,
            $recentSameIpOrders >= 2 => 8.0,
            default => 0.0,
        };
    }

    private function extractCountry(string $address): ?string
    {
        $segments = array_values(array_filter(array_map(
            static fn (string $segment): string => trim($segment),
            explode(',', $address),
        )));

        if ($segments === []) {
            return null;
        }

        return Str::upper($segments[array_key_last($segments)]);
    }

    private function looksDisposableEmail(string $email): bool
    {
        $domain = Str::of($email)->after('@')->lower()->value();

        return in_array($domain, [
            'maildrop.cc',
            'trashmail.com',
            'tempmail.test',
            'disposable.test',
        ], true);
    }
}
