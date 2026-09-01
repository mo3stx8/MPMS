@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Rejections Analysis</h2>
    
    <div style="width: 100%; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
            <tr>
                <td style="width: 100%; background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #991b1b; display: block;">{{ $rejectionCount }}</span>
                    <span style="font-size: 11px; color: #991b1b; text-transform: uppercase;">Total Rejections in Period</span>
                </td>
            </tr>
        </table>
    </div>

    <h2 class="section-title">Primary Rejection Reasons</h2>
    <table>
        <thead>
            <tr>
                <th>Reason Category</th>
                <th>Estimated Frequency</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rejectionReasons as $reason)
                <tr>
                    <td>{{ $reason['name'] }}</td>
                    <td>{{ $reason['value'] }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2 class="section-title">Recent Rejection Details</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Vessel</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rejectionLogs as $log)
                <tr>
                    <td>{{ $log->created_at->format('Y-m-d') }}</td>
                    <td>{{ $log->vessel_name }}</td>
                    <td>{{ $log->details }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
