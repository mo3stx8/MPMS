@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Comprehensive Port Activity Summary</h2>
    
    <div style="width: 100%; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
            <tr>
                <td style="width: 50%; background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $vesselCount }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Vessels in Records</span>
                </td>
                <td style="width: 50%; background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $approvalRate }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Overall Approval Rate</span>
                </td>
            </tr>
        </table>
    </div>

    <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff;">
        <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px;">Executive Summary</h3>
        <p style="font-size: 14px; color: #475569; line-height: 1.8;">
            {{ $summary }}
        </p>
    </div>

    <h2 class="section-title">Key Operational Highlights</h2>
    <p style="font-size: 13px; color: #64748b;">
        This report encompasses all logged events, vessel registrations, and decision outcomes within the specified date range. 
        It serves as the master record for executive review of port efficiency and regulatory compliance.
    </p>

    <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic;">
        End of Comprehensive Report
    </div>
@endsection
