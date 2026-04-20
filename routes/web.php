<?php

declare(strict_types=1);

use App\Http\Controllers\DemoQueueJobController;
use App\Http\Controllers\DemoOrderBatchController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderDecisionController;
use App\Http\Controllers\OrderDashboardController;
use App\Http\Controllers\OrderInvestigationNoteController;
use App\Http\Controllers\QueueMonitorController;
use App\Http\Controllers\ResetDemoDataController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/orders');

Route::get('/orders', OrderDashboardController::class)
    ->name('orders.index');

Route::post('/orders/demo-batch', [DemoOrderBatchController::class, 'store'])
    ->name('orders.demo-batch');

Route::post('/orders/reset-demo-data', ResetDemoDataController::class)
    ->name('orders.reset-demo-data');

Route::get('/queue-monitor', QueueMonitorController::class)
    ->name('queue.monitor');

Route::post('/queue-monitor/demo-job', DemoQueueJobController::class)
    ->name('queue.monitor.demo-job');

Route::post('/orders', [OrderController::class, 'store'])
    ->name('orders.store');

Route::post('/orders/{order}/investigation-note', OrderInvestigationNoteController::class)
    ->name('orders.investigation-note');

Route::post('/orders/{order}/decision', OrderDecisionController::class)
    ->name('orders.decision');
