<?php

declare(strict_types=1);

use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderDashboardController;
use App\Http\Controllers\OrderInvestigationNoteController;
use App\Http\Controllers\QueueMonitorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/orders');

Route::get('/orders', OrderDashboardController::class)
    ->name('orders.index');

Route::get('/horizon', QueueMonitorController::class)
    ->name('queue.monitor');

Route::post('/orders', [OrderController::class, 'store'])
    ->name('orders.store');

Route::post('/orders/{order}/investigation-note', OrderInvestigationNoteController::class)
    ->name('orders.investigation-note');
