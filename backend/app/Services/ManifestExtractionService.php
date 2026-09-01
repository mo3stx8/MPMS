<?php

namespace App\Services;

use thiagoalessio\TesseractOCR\TesseractOCR;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\StorageKeyword;

class ManifestExtractionService
{
    /**
     * Required fields that OCR must extract for a manifest to be considered complete.
     */
    private const REQUIRED_FIELDS = [
        'date',
        'consignee_name',
    ];

    /**
     * Mandatory headers that MUST be present for a document to be valid.
     */
    private const VERIFICATION_CHECKLIST = [
        'Date' => '/(date)/i',
        'Number and kg of packages' => '/(number\s+and\s+kg\s+of)/i',
        'Description of goods' => '/(description\s+of\s+goods)/i',
        'Shipper/Exporter' => '/(shipper\s*[\\\\\/]\s*exporter)/i',
        'Consignee' => '/(consignee)/i',
    ];

    /**
     * Extract Data from Manifest PDFs/Images.
     */
    public function extractData($filePath, $vessel = null)
    {
        // 1. Perform OCR
        $rawText = $this->performOCR($filePath);

        // 2. The "Empty Text" Guard
        if (!$rawText || strlen(trim($rawText)) < 20) {
            return [
                'is_invalid' => true,
                'extraction_status' => 'failed',
                'error_reason' => 'Invalid File: No readable document text found. Please ensure the scan is clear and contains a shipping manifest.',
                'extraction_errors' => ['Invalid File: No readable document text found. Please ensure the scan is clear and contains a shipping manifest.'],
            ];
        }

        $rawTextLower = strtolower($rawText);

        // 3. Checklist Validation
        $missingFields = [];
        foreach (self::VERIFICATION_CHECKLIST as $fieldName => $pattern) {
            if (!preg_match($pattern, $rawTextLower)) {
                $missingFields[] = $fieldName;
            }
        }

        // 4. Fail Fast & Report
        if (!empty($missingFields)) {
            $reason = "Rejected: This document is not a shipping manifest. It completely lacks the mandatory headers such as: " . implode(', ', $missingFields);
            return [
                'is_invalid' => true,
                'extraction_status' => 'failed',
                'error_reason' => $reason,
                'extraction_errors' => [$reason],
            ];
        }

        // --- Data Extraction from OCR text ---

        // Extract Date: flexible patterns anywhere in document e.g. 02.05.2025, 2026-04-12, 12/04/2026
        $extractedDate = now()->format('Y-m-d'); // Default fallback
        if (preg_match('/(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}|\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2})/', $rawText, $matches)) {
            // Normalize separators and parse to Y-m-d to prevent MySQL exceptions
            try {
                $cleanDate = str_replace(['.', '/'], '-', $matches[1]);
                $extractedDate = \Carbon\Carbon::parse($cleanDate)->format('Y-m-d');
            } catch (\Exception $e) {
                // Keep default fallback
            }
        }

        // Port of Loading from Vessel
        $extractedPort = $vessel ? ($vessel->port_of_loading ?? $vessel->flag ?? 'Unknown') : 'Unknown';

        // Optional Description Extract for Categorization (won't fail if empty)
        $extractedDescription = '';

        // Edge case: Table extraction often jumbles description with other cells.
        // We dynamically search for our known chemical, frozen, and dry goods keywords.
        $dbKeywords = StorageKeyword::pluck('keyword')->toArray();
        $knownGoodsKeywords = array_merge(
            ['acid', 'toxin', 'toxic', 'fertilizer', 'chemical', 'hazardous', 'flammable', 'frozen', 'meat', 'chicken', 'refrigerated', 'fish', 'iron', 'steel', 'wood'],
            $dbKeywords
        );
        $keywordRegex = implode('|', array_map('preg_quote', $knownGoodsKeywords));
        
        // Grab the phrase surrounding the matched keyword (up to 3 words before/after)
        if (preg_match('/(?:\b[a-zA-Z_0-9]+\s+){0,3}(?:' . $keywordRegex . ')(?:\s+[a-zA-Z_0-9]+\b){0,3}/i', $rawText, $matches)) {
            $match = trim($matches[0]);
            
            // If it grabbed a company name or header, aggressively split and take the preceding text
            if (preg_match('/(shipper|exporter|consignee|date|company)/i', $match, $splitters)) {
                $match = trim(preg_split('/(shipper|exporter|consignee|date|company)/i', $match)[0]);
            }
            
            // Clean up trailing small words like "for", "Oman"
            $match = trim(preg_replace('/\b(?:for|oman|the|of)\b$/i', '', $match));

            if (strlen($match) >= 3) {
                $extractedDescription = ucfirst(strtolower($match));
            }
        }

        // Try to find the actual description, avoiding other headers
        if (!$extractedDescription && preg_match('/description\s+of\s+goods\s*[:\-]?\s*([^\n\r]+)/i', $rawText, $matches)) {
            $match = trim($matches[1]);
            // If the matched text is just another header, we ignore it and search the body
            if (!preg_match('/shipper|exporter|consignee|date/i', $match)) {
                $extractedDescription = $match;
            }
        }

        // If extraction failed or we caught a header, let's try a broader search for goods keywords
        if (!$extractedDescription) {
            if (preg_match('/(?:pallets?|boxes|containers?|frozen|fish|chicken|meat|supplies|goods|cargo)\s+of\s+([^\n\r]+)/i', $rawTextLower, $matches)) {
                $match = trim($matches[0]);
                // Ensure we don't accidentally grab company names
                if (!str_contains(strtolower($match), 'company')) {
                    $extractedDescription = $match;
                }
            } else if (preg_match('/(pallets?\s+of\s+[^\n\r]+)/i', $rawTextLower, $matches)) {
                $extractedDescription = trim($matches[1]);
            }
        }

        // Inverted Consignee Lookup
        $extractedConsignee = '';
        $extractedPhone = '';
        $trader = null;

        // Fetch all active traders
        $traders = User::role('trader')->get();
        foreach ($traders as $t) {
            $nameExists = \Str::contains(strtolower($rawText), strtolower($t->name));
            $orgExists = $t->organization && \Str::contains(strtolower($rawText), strtolower($t->organization));

            if ($nameExists || $orgExists) {
                $trader = $t;
                $extractedConsignee = $t->name;
                $extractedPhone = $t->phone ?? '';
                break;
            }
        }

        // If no trader matched anywhere in the text
        if (!$trader) {
            $reason = "Manifest Rejected: No matching registered Trader account found in the document text.";
            return [
                'is_invalid' => true,
                'extraction_status' => 'failed',
                'error_reason' => $reason,
                'extraction_errors' => [$reason],
            ];
        }

        return [
            'port_of_loading' => $extractedPort,
            'date' => $extractedDate,
            'description' => $extractedDescription,
            'consignee_name' => $extractedConsignee,
            'consignee_phone' => $extractedPhone,
            'storage_type' => $this->categorizeGoods($rawTextLower, $extractedDescription),
            'trader_user_id' => $trader ? $trader->id : null,
        ];
    }

    protected function performOCR($filePath)
    {
        try {
            $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

            // Use Smalot native PDF parser for PDFs
            if ($extension === 'pdf') {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($filePath);
                return $pdf->getText();
            }

            // Use Tesseract for images
            $ocr = new TesseractOCR($filePath);

            // Windows fallback: if not in PATH, try common installation directories
            $commonPaths = [
                'C:\Program Files\Tesseract-OCR\tesseract.exe',
                'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                getenv('LOCALAPPDATA') . '\Programs\Tesseract-OCR\tesseract.exe'
            ];
            foreach ($commonPaths as $path) {
                if (file_exists($path)) {
                    $ocr->executable($path);
                    break;
                }
            }

            // Support English and fallback to standard
            $ocr->lang('eng', 'ara');

            return $ocr->run();
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            Log::error("Extraction Engine Failed: " . $msg);

            if (\Str::contains($msg, 'tessdata') || \Str::contains($msg, 'traineddata')) {
                throw new \Exception("CRITICAL ERROR: Tesseract is missing the English or Arabic Language packs! Please download 'eng.traineddata' and 'ara.traineddata' and place them in your C:\Program Files\Tesseract-OCR\tessdata folder.");
            }

            return ""; // Fallback to empty to trigger the empty text guard
        }
    }

    /**
     * Validates the extracted data against required fields.
     * Returns an array with 'status' ('success' | 'incomplete' | 'failed')
     * and 'errors' (list of missing/empty field names).
     */
    public function validateExtraction(array $extractedData): array
    {
        // Handle immediate verification failure from extractData
        if (isset($extractedData['is_invalid']) && $extractedData['is_invalid'] === true) {
            return [
                'status' => $extractedData['extraction_status'] ?? 'failed',
                'error_reason' => $extractedData['error_reason'] ?? 'Unknown validation error',
                'errors' => $extractedData['extraction_errors'] ?? ['Unknown validation error'],
            ];
        }

        $missingFields = [];

        foreach (self::REQUIRED_FIELDS as $field) {
            if (!isset($extractedData[$field]) || trim((string) $extractedData[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (empty($missingFields)) {
            return [
                'status' => 'success',
                'errors' => null,
            ];
        }

        // If ALL required fields are missing, it's a full failure (OCR likely returned nothing)
        if (count($missingFields) === count(self::REQUIRED_FIELDS)) {
            return [
                'status' => 'failed',
                'error_reason' => 'Failed to extract any required values from document text.',
                'errors' => $missingFields,
            ];
        }

        // Partial extraction — some fields are missing
        return [
            'status' => 'incomplete',
            'error_reason' => 'Partial extraction. Missing values for: ' . implode(', ', $missingFields),
            'errors' => $missingFields,
        ];
    }

    /**
     * Categorizes goods based on keyword matching.
     */
    public function categorizeGoods($rawText, $description = '')
    {
        // 1. Prepare texts
        $rawTextLower = strtolower((string) $rawText);
        $descriptionLower = strtolower((string) $description);

        // Remove misleading shipper names from the raw text to prevent false positives
        $rawTextLower = str_replace('company for chicken', '', $rawTextLower);

        // Prefer description if available, otherwise fallback to the sanitized raw text
        $textToSearch = $descriptionLower ?: $rawTextLower;

        // Combine hardcoded and dynamic DB keywords
        $dbChemicalKeywords = StorageKeyword::where('storage_type', 'chemical')->pluck('keyword')->toArray();
        $dbFrozenKeywords = StorageKeyword::where('storage_type', 'frozen')->pluck('keyword')->toArray();

        // 2. Strict Chemical Keyword Matching
        $chemicalKeywords = array_merge(['acid', 'toxin', 'chimcao', 'toxic', 'fertilizer', 'chemical', 'hazardous', 'flammable'], $dbChemicalKeywords);
        foreach ($chemicalKeywords as $keyword) {
            if (str_contains($textToSearch, strtolower($keyword))) {
                return 'chemical';
            }
        }

        // 3. Strict Frozen Keyword Matching
        $frozenKeywords = array_merge(['frozen', 'meat', 'chicken', '-18', 'refrigerated', 'temp', 'fish'], $dbFrozenKeywords);
        foreach ($frozenKeywords as $keyword) {
            if (str_contains($textToSearch, strtolower($keyword))) {
                return 'frozen';
            }
        }

        // 4. Safe Default
        return 'dry';
    }
}
