<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PortClearance;
use Carbon\Carbon;

class ArchivePortClearances extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:archive-port-clearances';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive port clearances whose 24-hour grace period after expiration or departure has elapsed';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $threshold = Carbon::now()->subHours(24);

        // 1. Expired clearances — expiry_date + 24h has passed and vessel has NOT departed
        $expiredCount = PortClearance::where('is_archived', false)
            ->whereNull('departed_at')
            ->where('expiry_date', '<', $threshold)
            ->whereNotIn('status', ['pending_clearance'])
            ->update(['is_archived' => true]);

        // 2. Departed clearances — departed_at + 24h has passed
        $departedCount = PortClearance::where('is_archived', false)
            ->whereNotNull('departed_at')
            ->where('departed_at', '<', $threshold)
            ->update(['is_archived' => true]);

        $total = $expiredCount + $departedCount;

        $this->info("Archived {$total} port clearance(s): {$expiredCount} expired, {$departedCount} departed.");

        return Command::SUCCESS;
    }
}
