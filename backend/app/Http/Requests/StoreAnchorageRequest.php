<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\AnchorageRequest;
use Illuminate\Validation\ValidationException;

class StoreAnchorageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'vessel_id' => 'required|exists:vessels,id',
            'duration' => 'required|string|max:255',
            'reason' => 'required|string|max:1000',
            'docking_time' => 'required|date|after_or_equal:today',
        ];
    }

    /**
     * Handle a passed validation attempt.
     */
    protected function passedValidation()
    {
        $pendingRequest = AnchorageRequest::where('vessel_id', $this->vessel_id)
            ->where('status', 'pending')
            ->first();

        if ($pendingRequest) {
            throw ValidationException::withMessages([
                'vessel_id' => 'An Agent cannot submit a new "Docking Request" for a ship if a previous request for the same ship is still "Pending".',
            ]);
        }
    }
}
