<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreOrderDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'decision_status' => ['required', 'string', Rule::in(['approved', 'blocked', 'escalated'])],
            'decision_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
