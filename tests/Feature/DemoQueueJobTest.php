<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\DemoQueuePulse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class DemoQueueJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_job_can_be_dispatched_from_queue_monitor(): void
    {
        Queue::fake();

        $response = $this->post('/queue-monitor/demo-job');

        $response
            ->assertRedirect('/queue-monitor')
            ->assertSessionHas('status', 'Demo job queued on `default`.');

        Queue::assertPushed(DemoQueuePulse::class, function (DemoQueuePulse $job): bool {
            return $job->queue === 'default' && $job->reference !== '';
        });
    }
}
