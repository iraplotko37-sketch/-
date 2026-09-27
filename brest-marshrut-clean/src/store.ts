import { create } from "zustand";
import type { TransportKind } from "@/lib/network";
import { readClock } from "@/lib/schedule";

export type KindFilter = "all" | TransportKind;

interface TransitState {
  query: string;
  kind: KindFilter;
  selectedStopId: number | null;
  selectedRouteId: number | null;
  selectedDirectionId: string | null;
  pitch3d: boolean;
  favorites: number[];
  simMinutes: number | null;
  setQuery: (q: string) => void;
  setKind: (k: KindFilter) => void;
  selectStop: (id: number | null) => void;
  selectRoute: (routeId: number | null, directionId?: string | null) => void;
  togglePitch: () => void;
  toggleFavorite: (id: number) => void;
  setSimMinutes: (n: number | null) => void;
}

const FAV_KEY = "brest-fav-stops";

function defaultSim(): number | null {
  const c = readClock();
  if (c.minutes >= 21 * 60 || c.minutes < 6 * 60) return 8 * 60 + 30;
  return null;
}

function loadFavs(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export const useTransit = create<TransitState>((set, get) => ({
  query: "",
  kind: "all",
  selectedStopId: null,
  selectedRouteId: null,
  selectedDirectionId: null,
  pitch3d: true,
  favorites: loadFavs(),
  simMinutes: defaultSim(),
  setQuery: (query) => set({ query }),
  setKind: (kind) => set({ kind }),
  selectStop: (selectedStopId) =>
    set({
      selectedStopId,
      selectedRouteId: selectedStopId ? get().selectedRouteId : null,
      selectedDirectionId: selectedStopId ? get().selectedDirectionId : null,
    }),
  selectRoute: (selectedRouteId, selectedDirectionId = null) =>
    set({ selectedRouteId, selectedDirectionId: selectedDirectionId ?? null }),
  togglePitch: () => set({ pitch3d: !get().pitch3d }),
  toggleFavorite: (id) => {
    const cur = get().favorites;
    const favorites = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    set({ favorites });
  },
  setSimMinutes: (simMinutes) => set({ simMinutes }),
}));
