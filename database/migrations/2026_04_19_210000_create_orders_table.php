<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('customer_email');
            $table->decimal('total_amount', 10, 2);
            $table->string('ip_address', 45);
            $table->text('billing_address');
            $table->text('shipping_address');
            $table->float('risk_score')->default(0);
            $table->text('ai_investigation_note')->nullable();
            $table->timestamps();

            $table->index('ip_address');
            $table->index('risk_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
