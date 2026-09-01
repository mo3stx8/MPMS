@extends('pdf.reports.layout')

@section('content')
    <h2 class="section-title">Performance Metrics Summary</h2>
    
    <div style="width: 100%; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
            <tr>
                <td style="width: 25%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $avgTurnaround }}h</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Avg Turnaround</span>
                </td>
                <td style="width: 25%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $approvalRate }}%</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Approval Rate</span>
                </td>
                <td style="width: 25%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $totalVessels }}</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Vessels</span>
                </td>
                <td style="width: 25%; background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; color: #1e3a8a; display: block;">{{ $efficiency }}%</span>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Operational Efficiency</span>
                </td>
            </tr>
        </table>
    </div>

    <h2 class="section-title">Throughput Analysis (by Vessel Type)</h2>
    <table>
        <thead>
            <tr>
                <th>Vessel Type</th>
                <th>Count</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody>
            @foreach($throughput as $type)
                <tr>
                    <td>{{ $type->type }}</td>
                    <td>{{ $type->count }}</td>
                    <td>{{ round(($type->count / max($totalVessels, 1)) * 100, 1) }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2 class="section-title">Efficiency Trends</h2>
    <p style="font-size: 13px; color: #64748b;">Turnaround time breakdown by month for the current reporting period.</p>
    <table>
        <thead>
            <tr>
                <th>Period</th>
                <th>Avg Turnaround (Hours)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($turnaroundTrends as $trend)
                <tr>
                    <td>{{ $trend['name'] }}</td>
                    <td>{{ $trend['avg'] }}h</td>
                    <td>
                        @if($trend['avg'] <= $trend['target'])
                            <span style="color: #166534; font-weight: bold;">Within Target</span>
                        @else
                            <span style="color: #991b1b; font-weight: bold;">Above Target</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
