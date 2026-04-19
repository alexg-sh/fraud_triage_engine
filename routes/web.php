<?php

declare(strict_types=1);

use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderDashboardController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/orders');

Route::get('/orders', OrderDashboardController::class)
    ->name('orders.index');

Route::post('/orders', [OrderController::class, 'store'])
    ->name('orders.store');
