@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Operational Overview</h2>
    
    <div style="width: 100%; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
            <tr>
                <td style="width: 33%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $vesselCount }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Vessels Registered</span>
                </td>
                <td style="width: 33%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $clearanceCount }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Clearances Issued</span>
                </td>
                <td style="width: 33%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $logCount }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Operational Logs recorded</span>
                </td>
            </tr>
        </table>
    </div>

    <h2 class="section-title">Vessel Status Distribution</h2>
    <table>
        <thead>
            <tr>
                <th>Status</th>
                <th>Count</th>
            </tr>
        </thead>
        <tbody>
            @foreach($vesselsByStatus as $status)
                <tr>
                    <td style="text-transform: capitalize;">{{ $status->status }}</td>
                    <td>{{ $status->count }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2 class="section-title">Recent Operational Activity</h2>
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Vessel</th>
                <th>Action</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($recentLogs as $log)
                <tr>
                    <td>{{ $log->created_at->format('Y-m-d H:i') }}</td>
                    <td>{{ $log->vessel_name }}</td>
                    <td>{{ ucwords(str_replace('_', ' ', $log->action)) }}</td>
                    <td>
                        @php
                            $status = 'pending';
                            if (str_contains($log->action, 'approve')) $status = 'approved';
                            if (str_contains($log->action, 'reject')) $status = 'rejected';
                            if (str_contains($log->action, 'issue')) $status = 'approved';
                        @endphp
                        <span class="status-badge status-{{ $status }}">{{ $status }}</span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
