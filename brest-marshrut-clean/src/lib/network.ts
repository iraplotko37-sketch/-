import raw from "@/data/network.json";

export type TransportKind = "bus" | "trolley";

export interface Stop {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Direction {
  id: string;
  name: string;
  stops: number[];
  weekday: number[];
  weekend: number[];
  offsets: number[];
  shape: [number, number][];
}

export interface Route {
  id: number;
  slug: string;
  number: string;
  kind: TransportKind;
  directions: Direction[];
}

export interface Network {
  city: string;
  source: string;
  updated: string;
  center: [number, number];
  stops: Stop[];
  routes: Route[];
}

export const network = raw as Network;

export const stopById = new Map(network.stops.map((s) => [s.id, s]));

export function kindLabel(kind: TransportKind) {
  return kind === "bus" ? "Автобус" : "Троллейбус";
}

export function kindShort(kind: TransportKind) {
  return kind === "bus" ? "А" : "Т";
}

export function routesThroughStop(stopId: number): Array<{
  route: Route;
  direction: Direction;
  stopIndex: number;
}> {
  const out: Array<{ route: Route; direction: Direction; stopIndex: number }> = [];
  for (const route of network.routes) {
    for (const direction of route.directions) {
      const stopIndex = direction.stops.indexOf(stopId);
      if (stopIndex >= 0) out.push({ route, direction, stopIndex });
    }
  }
  return out;
}

export function normalizeQuery(q: string) {
  return q.toLowerCase().replace(/ё/g, "е").trim();
}
