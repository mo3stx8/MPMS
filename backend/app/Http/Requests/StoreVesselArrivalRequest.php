<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVesselArrivalRequest extends FormRequest
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
            'imo_number' => 'required|string|regex:/^IMO\d{7}$/',
            'name' => 'required|string|max:255|regex:/^[\x20-\x7E\n\r]*$/',
            'type' => 'required|string|in:container,bulk,tanker,ro-ro,general',
            'expected_containers' => 'nullable|integer|min:1|required_if:type,container',
            'flag' => 'nullable|string|max:100|regex:/^[\x20-\x7E\n\r]*$/',
            'eta' => 'required|date|after_or_equal:today',
            'purpose' => 'required|string|regex:/^[\x20-\x7E\n\r]*$/',
            'cargo' => 'nullable|string|regex:/^[\x20-\x7E\n\r]*$/',
            'priority' => 'required|string|in:Low,Medium,High',
            'priority_reason' => 'nullable|required_if:priority,Medium|string|min:20|regex:/^[\x20-\x7E\n\r]*$/',
            'priority_document' => 'nullable|required_if:priority,High|file|mimes:pdf,jpeg,jpg|max:10240',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'The vessel name must only contain English characters.',
            'flag.regex' => 'The flag must only contain English characters.',
            'purpose.regex' => 'The purpose must only contain English characters.',
            'cargo.regex' => 'The cargo must only contain English characters.',
            'priority_reason.regex' => 'The priority reason must only contain English characters.',
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     */
    public function after(): array
    {
        return [
            function (\Illuminate\Validation\Validator $validator) {
                $exists = \App\Models\Vessel::where('imo_number', $this->imo_number)
                    ->whereNotIn('status', ['departed', 'archived', 'rejected'])
                    ->exists();

                if ($exists) {
                    $validator->errors()->add(
                        'imo_number',
                        'An active arrival notification already exists for this vessel. The vessel must depart before a new notification can be created.'
                    );
                }
            }
        ];
    }
}
