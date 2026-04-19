<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreOrderRequest extends FormRequest
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
            'customer_email' => ['required', 'email:rfc'],
            'total_amount' => ['required', 'numeric', 'min:0.01'],
            'ip_address' => ['required', 'ip'],
            'billing_address' => ['required', 'string', 'max:500'],
            'shipping_address' => ['required', 'string', 'max:500'],
        ];
    }
}
