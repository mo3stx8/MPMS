@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Revenue & Financial Metrics (Mock Data)</h2>
    
    <div style="width: 100%; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
            <tr>
                <td style="width: 50%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">${{ number_format($estimatedRevenue, 2) }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Estimated Fees Collected</span>
                </td>
                <td style="width: 50%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $billableEvents }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Billable Operational Events</span>
                </td>
            </tr>
        </table>
    </div>

    <h2 class="section-title">Fee Breakdown Projection</h2>
    <table>
        <thead>
            <tr>
                <th>Service Category</th>
                <th>Units</th>
                <th>Estimated Revenue</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Anchorage & Berthing Fees</td>
                <td>{{ $vesselCount }} Vessels</td>
                <td>${{ number_format($vesselCount * 1250.50, 2) }}</td>
            </tr>
            <tr>
                <td>Clearance Processing Fees</td>
                <td>{{ $clearanceCount }} Certificates</td>
                <td>${{ number_format($clearanceCount * 450.00, 2) }}</td>
            </tr>
            <tr>
                <td>Manifest Extraction & Handling</td>
                <td>{{ $vesselCount * 4 }} Batches</td>
                <td>${{ number_format($vesselCount * 4 * 125.00, 2) }}</td>
            </tr>
        </tbody>
        <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="2">TOTAL ESTIMATED</td>
                <td>${{ number_format(($vesselCount * 1250.50) + ($clearanceCount * 450.00) + ($vesselCount * 4 * 125.00), 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <div style="margin-top: 50px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc;">
        <h3 style="margin-top: 0; color: #1e3a8a; font-size: 14px;">Financial Compliance Note</h3>
        <p style="font-size: 12px; color: #475569; margin-bottom: 0;">
            This financial report is an automated projection based on operational volume. Actual billing data should be reconciled with the Manarah Port Finance Department's centralized ledger (ERP). 
            Fees calculated using standard port tariffs as of {{ now()->year }}.
        </p>
    </div>
@endsection
