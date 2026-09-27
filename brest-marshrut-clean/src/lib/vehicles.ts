import { network, type TransportKind } from "@/lib/network";
import { pointAlong, type Clock } from "@/lib/schedule";

export interface Vehicle {
  id: string;
  routeId: number;
  number: string;
  kind: TransportKind;
  directionId: string;
  directionName: string;
  lng: number;
  lat: number;
  bearing: number;
  progress: number;
}

export function activeVehicles(clock: Clock, kindFilter: "all" | TransportKind = "all"): Vehicle[] {
  const now = clock.minutes + clock.seconds / 60;
  const out: Vehicle[] = [];
  for (const route of network.routes) {
    if (kindFilter !== "all" && route.kind !== kindFilter) continue;
    for (const direction of route.directions) {
      if (direction.shape.length < 2) continue;
      const duration = Math.max(direction.offsets[direction.offsets.length - 1] ?? 12, 6);
      const deps = clock.weekend ? direction.weekend : direction.weekday;
      for (const dep of deps) {
        const elapsed = now - dep;
        if (elapsed < -0.15 || elapsed > duration) continue;
        const t = Math.min(1, Math.max(0, elapsed / duration));
        const pos = pointAlong(direction.shape, t);
        out.push({
          id: `${route.id}-${direction.id}-${dep}`,
          routeId: route.id,
          number: route.number,
          kind: route.kind,
          directionId: direction.id,
          directionName: direction.name,
          lng: pos.lng,
          lat: pos.lat,
          bearing: pos.bearing,
          progress: t,
        });
      }
    }
  }
  return out;
}
