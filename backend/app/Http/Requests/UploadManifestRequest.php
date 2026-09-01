<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadManifestRequest extends FormRequest
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
            'file' => 'required|file|mimes:pdf,csv,xlsx|max:10240', // Max 10MB
            'total_weight' => 'required|numeric|min:0',
            'container_count' => 'required|integer|min:0',
        ];
    }
}
