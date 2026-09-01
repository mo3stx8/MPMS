<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Wharf;

$wharves = Wharf::all();
$names = [];
$deletedCount = 0;

foreach ($wharves as $wharf) {
    if (in_array($wharf->name, $names)) {
        $wharf->delete();
        echo "Deleted duplicate: {$wharf->name} (ID: {$wharf->id})\n";
        $deletedCount++;
    } else {
        $names[] = $wharf->name;
    }
}

echo "Total duplicates deleted: $deletedCount\n";
