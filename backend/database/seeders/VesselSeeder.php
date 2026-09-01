<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vessel;
use App\Models\User;
use App\Models\Wharf;
use App\Models\AnchorageRequest;
use App\Models\PortClearance;
use App\Models\Container;
use App\Models\DischargeRequest;
use App\Models\CargoManifest;
use App\Models\StorageArea;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VesselSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Disable foreign key checks to safely truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Delete all related records to ensure a fresh, clean slate
        DB::table('discharge_requests')->truncate();
        DB::table('containers')->truncate();
        DB::table('cargo_manifests')->truncate();
        DB::table('port_clearances')->truncate();
        DB::table('anchorage_requests')->truncate();
        DB::table('vessels')->truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Retrieve existing users to map permissions and ownership securely without changing them
        $agent = User::where('email', 'agent@example.com')->first();
        if (!$agent) {
            $agent = User::first(); // Fallback
        }

        if (!$agent) {
            $this->command->error('No agent or fallback user found in the database. Please seed users first.');
            return;
        }

        $trader = User::where('email', 'trader@example.com')->first();
        $traderId = $trader ? $trader->id : (User::where('role', 'trader')->first()?->id ?: 22);
        $officer = User::where('email', 'officer@example.com')->first();

        // Get all available wharves and storage areas to dynamically assign
        $wharves = Wharf::all();
        $storageAreas = StorageArea::all();

        $ships = [
            [
                'name' => 'MSC Gülsün',
                'imo_number' => '9839430',
                'flag' => 'Panama',
            ],
            [
                'name' => 'HMM Algeciras',
                'imo_number' => '9863297',
                'flag' => 'Panama',
            ],
            [
                'name' => 'Ever Ace',
                'imo_number' => '9893890',
                'flag' => 'Panama',
            ],
            [
                'name' => 'Ever Given',
                'imo_number' => '9811000',
                'flag' => 'Panama',
            ],
            [
                'name' => 'MSC Irina',
                'imo_number' => '9968095',
                'flag' => 'Liberia',
            ],
            [
                'name' => 'OOCL Hong Kong',
                'imo_number' => '9776171',
                'flag' => 'Hong Kong',
            ],
            [
                'name' => 'CMA CGM Jacques Saadé',
                'imo_number' => '9839179',
                'flag' => 'Malta',
            ],
            [
                'name' => 'Madrid Maersk',
                'imo_number' => '9778791',
                'flag' => 'Denmark',
            ],
            [
                'name' => 'MOL Triumph',
                'imo_number' => '9769271',
                'flag' => 'Marshall Islands',
            ],
            [
                'name' => 'ONE Innovation',
                'imo_number' => '9897468',
                'flag' => 'Japan',
            ],
            [
                'name' => 'COSCO Shipping Universe',
                'imo_number' => '9795622',
                'flag' => 'Hong Kong',
            ],
            [
                'name' => 'CMA CGM Antoine de Saint Exupery',
                'imo_number' => '9776418',
                'flag' => 'France',
            ],
            [
                'name' => 'MSC Tessa',
                'imo_number' => '9964908',
                'flag' => 'Liberia',
            ],
            [
                'name' => 'Ever Alot',
                'imo_number' => '9893931',
                'flag' => 'Panama',
            ],
            [
                'name' => 'Hyundai Courage',
                'imo_number' => '9458262',
                'flag' => 'South Korea',
            ],
            [
                'name' => 'Maersk Mc-Kinney Moller',
                'imo_number' => '9619907',
                'flag' => 'Denmark',
            ],
            [
                'name' => 'CSCL Globe',
                'imo_number' => '9695121',
                'flag' => 'Hong Kong',
            ],
            [
                'name' => 'APL Fullerton',
                'imo_number' => '9632208',
                'flag' => 'Singapore',
            ],
            [
                'name' => 'Xin Los Angeles',
                'imo_number' => '9732307',
                'flag' => 'Hong Kong',
            ],
            [
                'name' => 'YM Wellhead',
                'imo_number' => '9694608',
                'flag' => 'Taiwan',
            ],
        ];

        $statuses = ['awaiting', 'approved', 'wharf_assigned', 'departed'];

        foreach ($ships as $index => $shipData) {
            // Distribute statuses across the 20 ships
            $status = $statuses[intdiv($index, 5)];

            $wharfId = null;
            if ($status === 'wharf_assigned' && $wharves->count() > 0) {
                $wharfId = $wharves->random()->id;
            }

            // Generate realistic dates
            $eta = now()->addDays(rand(-10, 10));
            $etd = (clone $eta)->addDays(rand(2, 5));

            $vessel = Vessel::create([
                'name' => $shipData['name'],
                'imo_number' => $shipData['imo_number'],
                'flag' => $shipData['flag'],
                'type' => 'container',
                'owner_id' => $agent->id,
                'status' => $status,
                'expected_containers' => rand(500, 2500),
                'eta' => $eta,
                'etd' => $etd,
                'current_wharf_id' => $wharfId,
                'purpose' => 'discharge',
                'cargo' => 'containers',
                'priority' => rand(1, 10) > 8, // 20% chance of high priority
                'priority_reason' => 'Perishable goods / High value cargo',
            ]);

            // ─── 1. Seed Anchorage Requests ───
            if ($status === 'awaiting') {
                AnchorageRequest::create([
                    'vessel_id' => $vessel->id,
                    'agent_id' => $agent->id,
                    'status' => rand(0, 1) ? 'pending' : 'waitlisted',
                    'docking_time' => $eta,
                    'duration' => rand(24, 72),
                    'location' => 'Anchor Area A',
                    'reason' => 'Discharging cargo and fueling',
                    'duration_hours' => rand(24, 72),
                ]);
            } elseif ($status === 'approved') {
                AnchorageRequest::create([
                    'vessel_id' => $vessel->id,
                    'agent_id' => $agent->id,
                    'status' => 'approved',
                    'docking_time' => $eta,
                    'duration' => rand(24, 72),
                    'location' => 'Anchor Area B',
                    'reason' => 'Scheduled cargo handling',
                    'duration_hours' => rand(24, 72),
                ]);
            } elseif ($status === 'wharf_assigned' || $status === 'departed') {
                $wharf = $wharves->count() > 0 ? $wharves->random() : null;
                AnchorageRequest::create([
                    'vessel_id' => $vessel->id,
                    'agent_id' => $agent->id,
                    'status' => 'completed',
                    'docking_time' => (clone $eta)->subDays(1),
                    'duration' => rand(24, 72),
                    'location' => $wharf ? $wharf->name : 'Berth A',
                    'reason' => 'Cargo handling completed',
                    'wharf_id' => $wharf ? $wharf->id : null,
                    'wharf_assigned_at' => (clone $eta)->subDays(1),
                    'anchorage_started_at' => (clone $eta)->subDays(1),
                    'duration_hours' => rand(24, 72),
                ]);
            }

            // ─── 2. Seed Cargo Manifests, Port Clearances, & Containers for berthed/departed ───
            if ($status === 'wharf_assigned' || $status === 'departed') {
                // Seed Cargo Manifest record
                CargoManifest::create([
                    'vessel_id' => $vessel->id,
                    'uploaded_by' => $agent->id,
                    'status' => 'approved',
                    'file_path' => 'manifests/manifest_' . $vessel->imo_number . '.pdf',
                    'total_weight' => rand(15000, 45000),
                    'container_count' => rand(10, 25),
                ]);

                // Seed Clearances
                if ($status === 'wharf_assigned') {
                    PortClearance::create([
                        'vessel_id' => $vessel->id,
                        'officer_id' => $officer ? $officer->id : null,
                        'status' => rand(0, 1) ? 'pending' : 'approved',
                        'issue_date' => $eta,
                        'expiry_date' => (clone $eta)->addDays(3),
                        'next_port' => ['Aden', 'Salalah', 'Jebel Ali', 'Jeddah'][rand(0, 3)],
                        'is_archived' => false,
                    ]);
                } else {
                    PortClearance::create([
                        'vessel_id' => $vessel->id,
                        'officer_id' => $officer ? $officer->id : null,
                        'status' => 'cleared',
                        'issue_date' => $etd,
                        'expiry_date' => (clone $etd)->addDays(3),
                        'next_port' => ['Aden', 'Salalah', 'Jebel Ali', 'Jeddah'][rand(0, 3)],
                        'is_archived' => false,
                        'departed_at' => $etd,
                    ]);
                }

                // Seed Containers
                $goods = ['Electronics', 'Auto Parts', 'Clothing', 'Foodstuffs', 'Medical Equipment', 'Building Materials'];
                $storageTypes = ['dry', 'frozen', 'chemical'];
                $containerCount = rand(8, 15);
                $batchId = 'BATCH-' . Str::upper(Str::random(8));

                for ($i = 0; $i < $containerCount; $i++) {
                    $containerStatus = $status === 'departed' ? 'discharged' : (rand(0, 1) ? 'stored' : 'pending');
                    $storageAreaId = ($containerStatus === 'stored' && $storageAreas->count() > 0) ? $storageAreas->random()->id : null;

                    $container = Container::create([
                        'vessel_id' => $vessel->id,
                        'manifest_file_path' => 'manifests/manifest_' . $vessel->imo_number . '.pdf',
                        'port_of_loading' => ['Shanghai', 'Singapore', 'Rotterdam'][rand(0, 2)],
                        'arrival_date' => $eta,
                        'description_of_goods' => $goods[rand(0, count($goods) - 1)],
                        'storage_type' => $storageTypes[rand(0, count($storageTypes) - 1)],
                        'consignee_name' => $trader && $trader->name ? $trader->name : 'Consignee ' . ($i + 1),
                        'consignee_phone' => $trader && $trader->phone ? $trader->phone : '+967 77' . rand(1000000, 9999999),
                        'trader_user_id' => $trader ? $trader->id : null,
                        'status' => $containerStatus,
                        'extraction_status' => 'completed',
                        'storage_area_id' => $storageAreaId,
                    ]);

                    // Seed Discharge Requests for stored/discharged containers
                    if ($containerStatus === 'stored' || $containerStatus === 'discharged') {
                        $reqStatus = $containerStatus === 'discharged' ? 'approved' : (rand(0, 1) ? 'pending' : 'approved');

                        DischargeRequest::create([
                            'container_id' => $container->id,
                            'trader_id' => $traderId,
                            'status' => $reqStatus,
                            'requested_date' => (clone $eta)->addHours(rand(1, 24)),
                            'batch_id' => $batchId,
                            'vessel_id' => $vessel->id,
                            'notes' => 'Urgent clearance requested for trade warehouse distribution.',
                        ]);
                    }
                }
            }
        }

        $this->command->info('Successfully seeded 20 real container vessels with rich accessories.');
    }
}
