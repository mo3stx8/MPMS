<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Vessel;
use Illuminate\Validation\ValidationException;

class StoreArrivalNotificationRequest extends FormRequest
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
            'imo_number' => 'required|string|size:9',
            'name' => 'required|string',
            'type' => 'required|string',
            'flag' => 'nullable|string',
            'eta' => 'required|date|after_or_equal:now',
        ];
    }

    /**
     * Handle a passed validation attempt.
     */
    protected function passedValidation()
    {
        $vessel = Vessel::where('imo_number', $this->imo_number)
            ->where('status', 'awaiting')
            ->first();

        if ($vessel) {
            throw ValidationException::withMessages([
                'vessel' => 'A pending arrival notice already exists for this ship. Please wait for approval before submitting a new one.',
            ]);
        }
    }
}
