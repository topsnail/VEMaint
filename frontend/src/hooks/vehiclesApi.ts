import { apiFetch } from "../lib/http";
import type { Vehicle, VehicleCycle } from "../types";

export async function fetchVehiclesList(q: string) {
  return apiFetch<{ vehicles: Vehicle[] }>(`/vehicles?q=${encodeURIComponent(q)}`);
}

export async function fetchVehicleCycle(vehicleId: string) {
  return apiFetch<{ cycle: VehicleCycle | null }>(`/vehicles/${vehicleId}/cycles`);
}

export async function fetchVehiclesWithCyclesMap(q: string): Promise<{
  vehicles: Vehicle[];
  cyclesByVehicleId: Record<string, VehicleCycle | null>;
}> {
  const res = await fetchVehiclesList(q);
  if (!res.ok) return { vehicles: [], cyclesByVehicleId: {} };
  const cycleEntries = await Promise.all(
    res.data.vehicles.map(async (v) => {
      const cycleRes = await fetchVehicleCycle(v.id);
      return [v.id, cycleRes.ok ? cycleRes.data.cycle : null] as const;
    }),
  );
  return { vehicles: res.data.vehicles, cyclesByVehicleId: Object.fromEntries(cycleEntries) };
}

export async function requestUpsertVehicle(editingId: string | null, body: unknown) {
  return apiFetch<{ id?: string }>(editingId ? `/vehicles/${editingId}` : "/vehicles", {
    method: editingId ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
}

export async function requestPutVehicleCycles(vehicleId: string, body: unknown) {
  return apiFetch(`/vehicles/${vehicleId}/cycles`, { method: "PUT", body: JSON.stringify(body) });
}

export async function requestPutVehicleStatus(id: string, status: Vehicle["status"], reason?: string | null) {
  return apiFetch<{ ok: true }>(`/vehicles/${id}/status`, { method: "PUT", body: JSON.stringify({ status }), opReason: reason });
}
