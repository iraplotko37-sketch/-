import { network, routesThroughStop, type Direction, type TransportKind } from "@/lib/network";

const MINSK = "Europe/Minsk";

export interface Clock {
  minutes: number;
  seconds: number;
  weekday: number;
  weekend: boolean;
  label: string;
}

export function readClock(date = new Date()): Clock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MINSK,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  const wd = get("weekday");
  const weekend = wd === "Sat" || wd === "Sun";
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  return {
    minutes: hour * 60 + minute,
    seconds: second,
    weekday: weekdayMap[wd] ?? 1,
    weekend,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function appClock(simMinutes: number | null): Clock {
  const live = readClock();
  if (simMinutes == null) return live;
  const minutes = Math.floor(simMinutes);
  return {
    ...live,
    minutes,
    seconds: live.seconds,
    label: formatMinutes(minutes),
  };
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timesAtStop(direction: Direction, stopIndex: number, weekend: boolean) {
  const base = weekend ? direction.weekend : direction.weekday;
  const offset = direction.offsets[stopIndex] ?? 0;
  return base.map((t) => t + offset);
}

export interface Arrival {
  routeId: number;
  number: string;
  kind: TransportKind;
  directionId: string;
  directionName: string;
  minutes: number;
  wait: number;
  stopIndex: number;
}

export function arrivalsAtStop(stopId: number, clock: Clock, limit = 12): Arrival[] {
  const hits = routesThroughStop(stopId);
  const now = clock.minutes + clock.seconds / 60;
  const out: Arrival[] = [];
  for (const { route, direction, stopIndex } of hits) {
    const times = timesAtStop(direction, stopIndex, clock.weekend);
    for (const minutes of times) {
      const wait = minutes - now;
      if (wait < -0.2 || wait > 18 * 60) continue;
      out.push({
        routeId: route.id,
        number: route.number,
        kind: route.kind,
        directionId: direction.id,
        directionName: direction.name,
        minutes,
        wait,
        stopIndex,
      });
    }
  }
  out.sort((a, b) => a.wait - b.wait);
  return out.slice(0, limit);
}

export function groupByHour(times: number[]) {
  const map = new Map<number, number[]>();
  for (const t of times) {
    const h = Math.floor(t / 60) % 24;
    const m = Math.round(t % 60);
    const list = map.get(h) ?? [];
    list.push(m);
    map.set(h, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, minutes]) => ({ hour, minutes: minutes.sort((a, b) => a - b) }));
}

export function pointAlong(
  shape: [number, number][],
  t: number,
): { lng: number; lat: number; bearing: number } {
  if (shape.length === 0) return { lng: network.center[0], lat: network.center[1], bearing: 0 };
  if (shape.length === 1 || t <= 0) {
    const [lng, lat] = shape[0];
    const n = shape[1] ?? shape[0];
    return { lng, lat, bearing: bearingOf(lng, lat, n[0], n[1]) };
  }
  if (t >= 1) {
    const [lng, lat] = shape[shape.length - 1];
    const p = shape[shape.length - 2] ?? shape[0];
    return { lng, lat, bearing: bearingOf(p[0], p[1], lng, lat) };
  }
  const segs: number[] = [0];
  for (let i = 1; i < shape.length; i++) {
    const a = shape[i - 1];
    const b = shape[i];
    const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    const dy = (b[1] - a[1]) * 110540;
    segs.push(segs[i - 1] + Math.hypot(dx, dy));
  }
  const target = t * segs[segs.length - 1];
  let i = 1;
  while (i < segs.length && segs[i] < target) i++;
  const a = shape[i - 1];
  const b = shape[Math.min(i, shape.length - 1)];
  const span = segs[i] - segs[i - 1] || 1;
  const u = (target - segs[i - 1]) / span;
  return {
    lng: a[0] + (b[0] - a[0]) * u,
    lat: a[1] + (b[1] - a[1]) * u,
    bearing: bearingOf(a[0], a[1], b[0], b[1]),
  };
}

function bearingOf(lng1: number, lat1: number, lng2: number, lat2: number) {
  const y = Math.sin(((lng2 - lng1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lng2 - lng1) * Math.PI) / 180);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
