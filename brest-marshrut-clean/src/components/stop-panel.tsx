import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bus, Cable, Search, Star, X } from "lucide-react";
import { network, kindLabel, normalizeQuery, routesThroughStop, stopById } from "@/lib/network";
import {
  appClock,
  arrivalsAtStop,
  formatMinutes,
  groupByHour,
  readClock,
  timesAtStop,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { useTransit } from "@/store";

export function StopPanel() {
  const query = useTransit((s) => s.query);
  const setQuery = useTransit((s) => s.setQuery);
  const kind = useTransit((s) => s.kind);
  const setKind = useTransit((s) => s.setKind);
  const selectedStopId = useTransit((s) => s.selectedStopId);
  const selectStop = useTransit((s) => s.selectStop);
  const favorites = useTransit((s) => s.favorites);
  const stop = selectedStopId != null ? stopById.get(selectedStopId) : undefined;

  return (
    <aside className="pointer-events-none absolute inset-x-0 top-0 z-10 flex max-h-[56vh] flex-col p-3 md:inset-y-0 md:left-0 md:max-h-none md:w-[400px] md:p-4">
      <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-bg-elevated shadow-panel md:rounded-[28px]">
        <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 md:px-5 md:pt-5">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Брест</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Брестмаршрут</h1>
          </div>
          <ClockBadge />
        </header>

        <div className="px-4 md:px-5">
          <label className="flex h-11 items-center gap-2 rounded-md border border-border bg-paper px-3">
            <Search className="size-4 text-subtle" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Остановка или маршрут"
              className="h-full w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="text-subtle" aria-label="Очистить">
                <X className="size-4" />
              </button>
            ) : null}
          </label>
          <div className="mt-3 flex gap-1 rounded-md bg-bg p-1">
            {(
              [
                ["all", "Все"],
                ["bus", "Автобус"],
                ["trolley", "Троллейбус"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={cn(
                  "h-9 flex-1 rounded-sm text-sm font-medium transition-colors duration-150",
                  kind === id ? "bg-paper text-fg shadow-panel" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4 md:px-3">
          {stop ? (
            <StopDetail stopId={stop.id} onBack={() => selectStop(null)} />
          ) : (
            <StopList query={query} kind={kind} favorites={favorites} />
          )}
        </div>
      </div>
    </aside>
  );
}

function ClockBadge() {
  const [label, setLabel] = useState("--:--");
  useEffect(() => {
    const tick = () => setLabel(readClock().label);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-md border border-border px-2.5 py-1.5 text-right">
      <p className="font-mono text-sm tabular-nums text-fg">{label}</p>
      <p className="text-[10px] tracking-wide text-subtle">Минск</p>
    </div>
  );
}

function StopList({
  query,
  kind,
  favorites,
}: {
  query: string;
  kind: "all" | "bus" | "trolley";
  favorites: number[];
}) {
  const selectStop = useTransit((s) => s.selectStop);
  const q = normalizeQuery(query);
  const simMinutes = useTransit((s) => s.simMinutes);
  const clock = appClock(simMinutes);

  const items = useMemo(() => {
    const fav = new Set(favorites);
    let list = network.stops;
    if (q) {
      list = list.filter((s) => {
        if (normalizeQuery(s.name).includes(q)) return true;
        return routesThroughStop(s.id).some(
          ({ route }) =>
            (kind === "all" || route.kind === kind) &&
            normalizeQuery(route.number).includes(q),
        );
      });
    }
    if (kind !== "all" && !q) {
      const ids = new Set<number>();
      for (const r of network.routes) {
        if (r.kind !== kind) continue;
        for (const d of r.directions) d.stops.forEach((id) => ids.add(id));
      }
      list = list.filter((s) => ids.has(s.id));
    }
    return [...list].sort((a, b) => {
      const fa = fav.has(a.id) ? 0 : 1;
      const fb = fav.has(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return a.name.localeCompare(b.name, "ru");
    });
  }, [q, kind, favorites]);

  return (
    <ul className="flex flex-col">
      {items.slice(0, 80).map((s) => {
        const next = arrivalsAtStop(s.id, clock, 3).filter(
          (a) => kind === "all" || a.kind === kind,
        );
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => selectStop(s.id)}
              className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150 hover:bg-bg"
            >
              <span>
                <span className="block text-sm font-medium text-fg">{s.name}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {uniqueNumbers(s.id, kind).slice(0, 6).map((n) => (
                    <span
                      key={n.key}
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-[11px] font-medium",
                        n.kind === "trolley" ? "bg-trolley text-accent-fg" : "bg-bus text-accent-fg",
                      )}
                    >
                      {n.number}
                    </span>
                  ))}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {next[0] ? (
                  <>
                    <span className="block font-mono text-sm tabular-nums text-fg">
                      {formatWait(next[0].wait)}
                    </span>
                    <span className="text-[11px] text-muted">{next[0].number}</span>
                  </>
                ) : (
                  <span className="text-[11px] text-subtle">нет рейсов</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function uniqueNumbers(stopId: number, kind: "all" | "bus" | "trolley") {
  const seen = new Set<string>();
  const out: { key: string; number: string; kind: "bus" | "trolley" }[] = [];
  for (const { route } of routesThroughStop(stopId)) {
    if (kind !== "all" && route.kind !== kind) continue;
    const key = `${route.kind}-${route.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, number: route.number, kind: route.kind });
  }
  return out;
}

function formatWait(wait: number) {
  if (wait < 1) return "сейчас";
  const m = Math.round(wait);
  if (m < 60) return `${m} мин`;
  return formatMinutes(wait);
}

function StopDetail({ stopId, onBack }: { stopId: number; onBack: () => void }) {
  const stop = stopById.get(stopId)!;
  const favorites = useTransit((s) => s.favorites);
  const toggleFavorite = useTransit((s) => s.toggleFavorite);
  const selectedRouteId = useTransit((s) => s.selectedRouteId);
  const selectedDirectionId = useTransit((s) => s.selectedDirectionId);
  const selectRoute = useTransit((s) => s.selectRoute);
  const kind = useTransit((s) => s.kind);
  const simMinutes = useTransit((s) => s.simMinutes);
  const clock = appClock(simMinutes);
  const [weekend, setWeekend] = useState(clock.weekend);

  const through = useMemo(
    () => routesThroughStop(stopId).filter(({ route }) => kind === "all" || route.kind === kind),
    [stopId, kind],
  );

  const arrivals = arrivalsAtStop(stopId, clock, 10).filter(
    (a) => kind === "all" || a.kind === kind,
  );

  const active =
    through.find((t) => t.route.id === selectedRouteId && t.direction.id === selectedDirectionId) ??
    through[0];

  const hours = active ? groupByHour(timesAtStop(active.direction, active.stopIndex, weekend)) : [];

  useEffect(() => {
    if (!selectedRouteId && through[0]) {
      selectRoute(through[0].route.id, through[0].direction.id);
    }
  }, [selectedRouteId, through, selectRoute]);

  return (
    <div className="px-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-md text-fg"
          aria-label="К списку остановок"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">{stop.name}</h2>
          <p className="text-xs text-muted">{through.length} направлений</p>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(stop.id)}
          className="flex size-10 items-center justify-center rounded-md"
          aria-label="В избранное"
        >
          <Star
            className={cn("size-4", favorites.includes(stop.id) ? "fill-fg text-fg" : "text-subtle")}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <section className="mt-3">
        <h3 className="px-1 text-xs font-medium tracking-wide text-muted uppercase">Ближайшие</h3>
        <ul className="mt-1">
          {arrivals.length === 0 ? (
            <li className="px-1 py-3 text-sm text-muted">На ближайшие часы рейсов нет</li>
          ) : (
            arrivals.map((a) => (
              <li key={`${a.routeId}-${a.directionId}-${a.minutes}`}>
                <button
                  type="button"
                  onClick={() => selectRoute(a.routeId, a.directionId)}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left hover:bg-bg"
                >
                  <span
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 font-mono text-sm font-medium text-accent-fg",
                      a.kind === "trolley" ? "bg-trolley" : "bg-bus",
                    )}
                  >
                    {a.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{a.directionName}</span>
                    <span className="text-xs text-muted">{kindLabel(a.kind)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm tabular-nums">{formatMinutes(a.minutes)}</span>
                    <span className="text-xs text-muted">{formatWait(a.wait)}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {active ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Расписание</h3>
            <div className="flex rounded-sm bg-bg p-0.5">
              <button
                type="button"
                onClick={() => setWeekend(false)}
                className={cn(
                  "h-8 rounded-sm px-2.5 text-xs font-medium",
                  !weekend ? "bg-paper text-fg shadow-panel" : "text-muted",
                )}
              >
                Будни
              </button>
              <button
                type="button"
                onClick={() => setWeekend(true)}
                className={cn(
                  "h-8 rounded-sm px-2.5 text-xs font-medium",
                  weekend ? "bg-paper text-fg shadow-panel" : "text-muted",
                )}
              >
                Выходные
              </button>
            </div>
          </div>

          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {through.map(({ route, direction }) => {
              const on = route.id === active.route.id && direction.id === active.direction.id;
              return (
                <button
                  key={`${route.id}-${direction.id}`}
                  type="button"
                  onClick={() => selectRoute(route.id, direction.id)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs",
                    on ? "border-fg bg-fg text-bg" : "border-border bg-paper text-fg",
                  )}
                >
                  {route.kind === "trolley" ? (
                    <Cable className="size-3.5" strokeWidth={1.75} />
                  ) : (
                    <Bus className="size-3.5" strokeWidth={1.75} />
                  )}
                  {route.number}
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-sm text-fg">{active.direction.name}</p>
          <p className="px-1 text-xs text-muted">
            {kindLabel(active.route.kind)} · остановка {active.stopIndex + 1} из {active.direction.stops.length}
          </p>

          <div className="mt-3 overflow-hidden rounded-md border border-border">
            {hours.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">Нет рейсов в этот день</p>
            ) : (
              hours.map((row) => (
                <div key={row.hour} className="flex gap-3 border-b border-border px-3 py-2 last:border-b-0">
                  <span className="w-8 font-mono text-sm font-medium tabular-nums text-muted">
                    {String(row.hour).padStart(2, "0")}
                  </span>
                  <span className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-sm tabular-nums text-fg">
                    {row.minutes.map((m, i) => (
                      <span key={`${row.hour}-${m}-${i}`}>{String(m).padStart(2, "0")}</span>
                    ))}
                  </span>
                </div>
              ))
            )}
          </div>

          <ol className="mt-4 border-l border-border pl-4">
            {active.direction.stops.map((sid, i) => {
              const s = stopById.get(sid);
              if (!s) return null;
              return (
                <li key={`${sid}-${i}`} className="relative pb-3">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1 size-2.5 rounded-full border",
                      sid === stopId ? "border-fg bg-fg" : "border-border bg-paper",
                    )}
                  />
                  <button type="button" onClick={() => useTransit.getState().selectStop(sid)} className="block w-full text-left">
                    <span className={cn("text-sm", sid === stopId ? "font-semibold text-fg" : "text-fg")}>{s.name}</span>
                    <span className="ml-2 font-mono text-xs tabular-nums text-muted">
                      +{Math.round(active.direction.offsets[i] ?? 0)} мин
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
