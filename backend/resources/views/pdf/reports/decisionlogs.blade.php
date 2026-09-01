@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Decision Logs Export</h2>
    
    <div style="margin-bottom: 20px;">
        <strong>Date Range:</strong> {{ $startDate }} to {{ $endDate }} <br>
        <strong>Decision Type Filter:</strong> {{ ucfirst($decisionType) }} <br>
        <strong>Total Logs:</strong> {{ count($logs) }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Request ID</th>
                <th>Type</th>
                <th>Vessel & Agent</th>
                <th>Decision</th>
                <th>Decided By</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
            @foreach($logs as $log)
                <tr>
                    <td style="font-family: monospace;">{{ $log['id'] }}</td>
                    <td><span style="text-transform: capitalize;">{{ $log['type'] }}</span></td>
                    <td>
                        <strong>{{ $log['vessel'] }}</strong><br>
                        <span style="font-size: 10px; color: #666;">{{ $log['agent'] }}</span>
                    </td>
                    <td>
                        <span style="color: {{ $log['decision'] === 'approved' ? '#15803d' : ($log['decision'] === 'rejected' ? '#b91c1c' : '#333') }}; text-transform: capitalize; font-weight: bold;">
                            {{ $log['decision'] }}
                        </span>
                    </td>
                    <td>{{ $log['decidedBy'] }}</td>
                    <td>{{ $log['timestamp'] }}</td>
                </tr>
                <tr>
                    <td colspan="6" style="padding: 10px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <span style="font-weight: bold; font-size: 10px; color: #64748b;">Justification:</span>
                        <div style="font-size: 11px; margin-top: 4px;">{{ $log['justification'] ?? 'No justification provided.' }}</div>
                    </td>
                </tr>
            @endforeach
            @if(count($logs) === 0)
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">No decision logs found for the selected criteria.</td>
                </tr>
            @endif
        </tbody>
    </table>
@endsection
