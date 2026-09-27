import { Box, Map as MapIcon } from "lucide-react";
import { network } from "@/lib/network";
import { formatMinutes, readClock } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { useTransit } from "@/store";

export function MapOverlay() {
  const pitch3d = useTransit((s) => s.pitch3d);
  const togglePitch = useTransit((s) => s.togglePitch);
  const simMinutes = useTransit((s) => s.simMinutes);
  const setSimMinutes = useTransit((s) => s.setSimMinutes);
  const live = readClock();
  const shown = simMinutes ?? live.minutes;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3 md:bottom-3 md:left-[416px] md:right-3 md:p-0">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-lg bg-bg-elevated px-3 py-2.5 shadow-panel md:max-w-md">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] leading-snug text-muted">
            ZippyBus · {network.updated}. Модели едут по графику.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-fg">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-bus" />
              Автобус
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-trolley" />
              Троллейбус
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 font-mono text-xs tabular-nums text-fg">{formatMinutes(shown)}</span>
          <input
            type="range"
            min={5 * 60}
            max={23 * 60}
            step={1}
            value={shown}
            onChange={(e) => setSimMinutes(Number(e.target.value))}
            className="h-1 flex-1 accent-accent"
            aria-label="Время на карте"
          />
          <button
            type="button"
            onClick={() => setSimMinutes(null)}
            className={cn(
              "h-8 rounded-sm px-2 text-xs font-medium",
              simMinutes == null ? "bg-fg text-bg" : "text-muted",
            )}
          >
            Сейчас
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={togglePitch}
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-lg bg-bg-elevated px-3 text-sm font-medium text-fg shadow-panel"
        >
          {pitch3d ? <Box className="size-4" strokeWidth={1.75} /> : <MapIcon className="size-4" strokeWidth={1.75} />}
          {pitch3d ? "3D" : "2D"}
        </button>
      </div>
    </div>
  );
}
