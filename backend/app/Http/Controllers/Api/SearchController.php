<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vessel;
use App\Models\Container;
use App\Models\AnchorageRequest;
use App\Models\PortClearance;
use App\Models\User;
use App\Models\Log;
use App\Models\DischargeRequest;
use App\Models\Wharf;

class SearchController extends Controller
{
    public function search(Request $request)
    {
        $q = $request->query('q');

        if (!$q || strlen($q) < 2) {
            return response()->json([]);
        }

        $user = $request->user();
        $role = $user->role ?? ($user->roles->first()->name ?? null);

        $results = [];

        if ($role === 'executive') {
            // Executive: Search globally across Vessels, Containers, Anchorage Requests, Users, Logs
            
            // 1. Vessels
            $vessels = Vessel::where('name', 'like', "%{$q}%")
                ->orWhere('imo_number', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($vessels as $vessel) {
                $results[] = [
                    'id' => $vessel->id,
                    'type' => 'vessel',
                    'title' => $vessel->name,
                    'subtitle' => 'IMO: ' . $vessel->imo_number . ' | Flag: ' . ($vessel->flag ?? 'N/A') . ' | Status: ' . ucfirst($vessel->status),
                    'targetTab' => 'vessel-history',
                    'params' => ['vesselId' => $vessel->id],
                ];
            }

            // 2. Containers
            $containers = Container::with(['vessel'])
                ->where('consignee_name', 'like', "%{$q}%")
                ->orWhere('consignee_phone', 'like', "%{$q}%")
                ->orWhere('description_of_goods', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($containers as $container) {
                $results[] = [
                    'id' => $container->id,
                    'type' => 'container',
                    'title' => 'Container #' . $container->id,
                    'subtitle' => 'Consignee: ' . $container->consignee_name . ' | Goods: ' . $container->description_of_goods . ' | Vessel: ' . ($container->vessel->name ?? 'N/A'),
                    'targetTab' => 'reports',
                    'params' => [],
                ];
            }

            // 3. Anchorage Requests
            $anchorageRequests = AnchorageRequest::with(['vessel'])
                ->whereHas('vessel', function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%");
                })
                ->orWhere('location', 'like', "%{$q}%")
                ->orWhere('reason', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($anchorageRequests as $requestItem) {
                $results[] = [
                    'id' => $requestItem->id,
                    'type' => 'anchorage',
                    'title' => 'Anchorage Request (' . ($requestItem->vessel->name ?? 'N/A') . ')',
                    'subtitle' => 'Reason: ' . $requestItem->reason . ' | Status: ' . ucfirst($requestItem->status),
                    'targetTab' => 'anchorage',
                    'params' => [],
                ];
            }

            // 4. Users
            $users = User::where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
                ->orWhere('organization', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($users as $u) {
                $results[] = [
                    'id' => $u->id,
                    'type' => 'user',
                    'title' => $u->name,
                    'subtitle' => 'Email: ' . $u->email . ' | Role: ' . ucfirst($u->role ?? 'N/A') . ' | Org: ' . ($u->organization ?? 'None'),
                    'targetTab' => 'user-directory',
                    'params' => [],
                ];
            }

            // 5. Logs
            $logs = Log::where('action', 'like', "%{$q}%")
                ->orWhere('vessel_name', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($logs as $log) {
                $results[] = [
                    'id' => $log->id,
                    'type' => 'log',
                    'title' => 'Log: ' . $log->action,
                    'subtitle' => 'Vessel: ' . ($log->vessel_name ?? 'N/A') . ' | Date: ' . ($log->created_at ? $log->created_at->format('Y-m-d H:i') : 'N/A'),
                    'targetTab' => 'logs',
                    'params' => [],
                ];
            }
        } elseif ($role === 'officer') {
            // Port Officer: Search operational resources (Vessels, Anchorage Requests, Port Clearances)
            
            // 1. Vessels
            $vessels = Vessel::where('name', 'like', "%{$q}%")
                ->orWhere('imo_number', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($vessels as $vessel) {
                $results[] = [
                    'id' => $vessel->id,
                    'type' => 'vessel',
                    'title' => $vessel->name,
                    'subtitle' => 'IMO: ' . $vessel->imo_number . ' | Status: ' . ucfirst($vessel->status),
                    'targetTab' => 'vessel-history',
                    'params' => ['vesselId' => $vessel->id],
                ];
            }

            // 2. Anchorage Requests
            $anchorageRequests = AnchorageRequest::with(['vessel'])
                ->whereHas('vessel', function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%");
                })
                ->orWhere('location', 'like', "%{$q}%")
                ->orWhere('reason', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($anchorageRequests as $requestItem) {
                $results[] = [
                    'id' => $requestItem->id,
                    'type' => 'anchorage',
                    'title' => 'Anchorage Request (' . ($requestItem->vessel->name ?? 'N/A') . ')',
                    'subtitle' => 'Reason: ' . $requestItem->reason . ' | Status: ' . ucfirst($requestItem->status),
                    'targetTab' => 'berthing',
                    'params' => [],
                ];
            }

            // 3. Port Clearances
            $clearances = PortClearance::with(['vessel'])
                ->where(function ($query) use ($q) {
                    $query->whereHas('vessel', function ($vq) use ($q) {
                        $vq->where('name', 'like', "%{$q}%");
                    })
                    ->orWhere('id', 'like', "%{$q}%")
                    ->orWhere('next_port', 'like', "%{$q}%");
                })
                ->limit(5)
                ->get();
            foreach ($clearances as $c) {
                $results[] = [
                    'id' => $c->id,
                    'type' => 'clearance',
                    'title' => 'Port Clearance #' . $c->id,
                    'subtitle' => 'Vessel: ' . ($c->vessel->name ?? 'N/A') . ' | Dest: ' . ($c->next_port ?? 'N/A') . ' | Status: ' . ucfirst($c->status),
                    'targetTab' => 'clearances',
                    'params' => [],
                ];
            }
        } elseif ($role === 'wharf') {
            // Wharf Manager: Search storage management resources (Containers, Wharves, Vessels)
            
            // 1. Containers
            $containers = Container::with(['vessel', 'storageArea'])
                ->where('consignee_name', 'like', "%{$q}%")
                ->orWhere('consignee_phone', 'like', "%{$q}%")
                ->orWhere('description_of_goods', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($containers as $container) {
                $results[] = [
                    'id' => $container->id,
                    'type' => 'container',
                    'title' => 'Container #' . $container->id,
                    'subtitle' => 'Goods: ' . $container->description_of_goods . ' | Consignee: ' . $container->consignee_name . ' | Area: ' . ($container->storageArea->name ?? 'N/A'),
                    'targetTab' => 'storage',
                    'params' => [],
                ];
            }

            // 2. Vessels
            $vessels = Vessel::where('name', 'like', "%{$q}%")
                ->orWhere('imo_number', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($vessels as $vessel) {
                $results[] = [
                    'id' => $vessel->id,
                    'type' => 'vessel',
                    'title' => $vessel->name,
                    'subtitle' => 'IMO: ' . $vessel->imo_number . ' | Status: ' . ucfirst($vessel->status),
                    'targetTab' => 'vessel-history',
                    'params' => ['vesselId' => $vessel->id],
                ];
            }

            // 3. Wharves
            $wharves = Wharf::where('name', 'like', "%{$q}%")
                ->limit(5)
                ->get();
            foreach ($wharves as $wharf) {
                $results[] = [
                    'id' => $wharf->id,
                    'type' => 'wharf',
                    'title' => $wharf->name . ' (ID: ' . $wharf->id . ')',
                    'subtitle' => 'Status: ' . ucfirst($wharf->status) . ' | Vessels Docked: ' . $wharf->vessels()->count(),
                    'targetTab' => 'availability',
                    'params' => [],
                ];
            }
        } elseif ($role === 'agent') {
            // Agent: Strictly isolated to own registered vessels, anchorage requests, and clearances
            
            // 1. Vessels (where owner_id = user_id)
            $vessels = Vessel::where('owner_id', $user->id)
                ->where(function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%")
                        ->orWhere('imo_number', 'like', "%{$q}%");
                })
                ->limit(5)
                ->get();
            foreach ($vessels as $vessel) {
                $results[] = [
                    'id' => $vessel->id,
                    'type' => 'vessel',
                    'title' => $vessel->name,
                    'subtitle' => 'IMO: ' . $vessel->imo_number . ' | Status: ' . ucfirst($vessel->status),
                    'targetTab' => 'vessels',
                    'params' => [],
                ];
            }

            // 2. Anchorage Requests (where agent_id = user_id)
            $anchorageRequests = AnchorageRequest::with(['vessel'])
                ->where('agent_id', $user->id)
                ->where(function ($query) use ($q) {
                    $query->whereHas('vessel', function ($vq) use ($q) {
                        $vq->where('name', 'like', "%{$q}%");
                    })
                    ->orWhere('location', 'like', "%{$q}%")
                    ->orWhere('reason', 'like', "%{$q}%");
                })
                ->limit(5)
                ->get();
            foreach ($anchorageRequests as $requestItem) {
                $results[] = [
                    'id' => $requestItem->id,
                    'type' => 'anchorage',
                    'title' => 'Anchorage Request (' . ($requestItem->vessel->name ?? 'N/A') . ')',
                    'subtitle' => 'Reason: ' . $requestItem->reason . ' | Status: ' . ucfirst($requestItem->status),
                    'targetTab' => 'anchorage',
                    'params' => [],
                ];
            }

            // 3. Port Clearances on their vessels (vessel.owner_id = user_id)
            $clearances = PortClearance::with(['vessel'])
                ->whereHas('vessel', function ($vq) use ($user) {
                    $vq->where('owner_id', $user->id);
                })
                ->where(function ($query) use ($q) {
                    $query->whereHas('vessel', function ($vq) use ($q) {
                        $vq->where('name', 'like', "%{$q}%");
                    })
                    ->orWhere('id', 'like', "%{$q}%")
                    ->orWhere('next_port', 'like', "%{$q}%");
                })
                ->limit(5)
                ->get();
            foreach ($clearances as $c) {
                $results[] = [
                    'id' => $c->id,
                    'type' => 'clearance',
                    'title' => 'Clearance #' . $c->id,
                    'subtitle' => 'Vessel: ' . ($c->vessel->name ?? 'N/A') . ' | Status: ' . ucfirst($c->status),
                    'targetTab' => 'clearances',
                    'params' => [],
                ];
            }
        } elseif ($role === 'trader') {
            // Trader: Strictly isolated to own containers and discharge requests
            
            // 1. Containers (where trader_user_id = user_id)
            $containers = Container::with(['vessel'])
                ->where('trader_user_id', $user->id)
                ->where(function ($query) use ($q) {
                    $query->where('consignee_name', 'like', "%{$q}%")
                        ->orWhere('description_of_goods', 'like', "%{$q}%");
                })
                ->limit(5)
                ->get();
            foreach ($containers as $container) {
                $results[] = [
                    'id' => $container->id,
                    'type' => 'container',
                    'title' => 'Container #' . $container->id,
                    'subtitle' => 'Goods: ' . $container->description_of_goods . ' | Vessel: ' . ($container->vessel->name ?? 'N/A') . ' | Status: ' . ucfirst($container->status),
                    'targetTab' => 'containers',
                    'params' => [],
                ];
            }

            // 2. Discharge Requests on their containers
            $dischargeRequests = DischargeRequest::with(['container.vessel'])
                ->whereHas('container', function ($cq) use ($user) {
                    $cq->where('trader_user_id', $user->id);
                })
                ->where(function ($query) use ($q) {
                    $query->where('status', 'like', "%{$q}%")
                        ->orWhereHas('container', function ($cq) use ($q) {
                            $cq->where('description_of_goods', 'like', "%{$q}%")
                                ->orWhereHas('vessel', function ($vq) use ($q) {
                                    $vq->where('name', 'like', "%{$q}%");
                                });
                        });
                })
                ->limit(5)
                ->get();
            foreach ($dischargeRequests as $dr) {
                $results[] = [
                    'id' => $dr->id,
                    'type' => 'discharge',
                    'title' => 'Discharge Request',
                    'subtitle' => 'Vessel: ' . ($dr->container->vessel->name ?? 'N/A') . ' | Goods: ' . ($dr->container->description_of_goods ?? 'N/A') . ' | Status: ' . ucfirst($dr->status),
                    'targetTab' => 'discharge',
                    'params' => [],
                ];
            }
        }

        return response()->json($results);
    }
}
