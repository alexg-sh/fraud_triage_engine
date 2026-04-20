<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderDecisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_analyst_decision_is_persisted(): void
    {
        Queue::fake();

        $order = Order::factory()->create([
            'risk_score' => 82.4,
        ]);

        $response = $this->postJson("/orders/{$order->id}/decision", [
            'decision_status' => 'blocked',
            'decision_note' => 'Shared IP cluster and cross-border delivery.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.decision_status', 'blocked')
            ->assertJsonPath('data.decision_note', 'Shared IP cluster and cross-border delivery.');

        $order->refresh();

        $this->assertSame('blocked', $order->decision_status);
        $this->assertSame('Shared IP cluster and cross-border delivery.', $order->decision_note);
        $this->assertNotNull($order->decisioned_at);
    }

    public function test_analyst_decision_can_be_replaced(): void
    {
        Queue::fake();

        $order = Order::factory()->create([
            'decision_status' => 'approved',
            'decision_note' => 'Initial analyst call.',
            'decisioned_at' => now()->subMinute(),
        ]);

        $response = $this->postJson("/orders/{$order->id}/decision", [
            'decision_status' => 'escalated',
            'decision_note' => 'Escalated to payments team.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.decision_status', 'escalated')
            ->assertJsonPath('data.decision_note', 'Escalated to payments team.');

        $order->refresh();

        $this->assertSame('escalated', $order->decision_status);
        $this->assertSame('Escalated to payments team.', $order->decision_note);
        $this->assertNotNull($order->decisioned_at);
    }
}
