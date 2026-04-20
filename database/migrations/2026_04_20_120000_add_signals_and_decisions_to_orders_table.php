<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->json('risk_signals')->nullable()->after('risk_score');
            $table->string('decision_status')->nullable()->after('ai_investigation_note');
            $table->text('decision_note')->nullable()->after('decision_status');
            $table->timestamp('decisioned_at')->nullable()->after('decision_note');

            $table->index('decision_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex(['decision_status']);
            $table->dropColumn([
                'risk_signals',
                'decision_status',
                'decision_note',
                'decisioned_at',
            ]);
        });
    }
};
