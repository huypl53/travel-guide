import { create } from "zustand";
import type { Location } from "@/lib/types";


export interface DrivingDistance {
  drivingKm: number;
  drivingMinutes: number;
}

function coordHash(homestays: Location[], destinations: Location[]): string {
  const coords = [
    ...homestays.map((h) => `${h.lat},${h.lon}`),
    "|",
    ...destinations.map((d) => `${d.lat},${d.lon}`),
  ];
  return coords.join(";");
}

async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

interface DistanceState {
  distances: Map<string, DrivingDistance>;
  routes: Map<string, [number, number][]>;
  routesLoading: boolean;
  loading: boolean;
  error: string | null;
  _lastCoordHash: string;
  fetchDistances: (homestays: Location[], destinations: Location[]) => Promise<void>;
  fetchRoutes: (homestay: Location, destinations: Location[]) => Promise<void>;
  clearDistances: () => void;
  clear: () => void;
}

export const useDistanceStore = create<DistanceState>((set, get) => ({
  distances: new Map(),
  routes: new Map(),
  routesLoading: false,
  loading: false,
  error: null,
  _lastCoordHash: "",

  fetchDistances: async (homestays, destinations) => {
    if (homestays.length === 0 || destinations.length === 0) {
      set({ distances: new Map(), loading: false, _lastCoordHash: "" });
      return;
    }

    const hash = coordHash(homestays, destinations);
    if (hash === get()._lastCoordHash) return;

    set({ loading: true, error: null });

    const sourcesParam = homestays.map((h) => `${h.lat},${h.lon}`).join(";");
    const destsParam = destinations.map((d) => `${d.lat},${d.lon}`).join(";");

    try {
      const res = await fetch(`/api/distances?sources=${sourcesParam}&destinations=${destsParam}`);
      if (!res.ok) throw new Error("Failed to fetch distances");

      const data = await res.json();
      const newDistances = new Map<string, DrivingDistance>();

      for (let s = 0; s < homestays.length; s++) {
        for (let d = 0; d < destinations.length; d++) {
          const entry = data.matrix[s][d];
          if (entry) {
            newDistances.set(`${homestays[s].id}:${destinations[d].id}`, {
              drivingKm: entry.distanceKm,
              drivingMinutes: entry.durationMinutes,
            });
          }
        }
      }

      set({ distances: newDistances, loading: false, _lastCoordHash: hash });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchRoutes: async (homestay, destinations) => {
    if (destinations.length === 0) return;

    // Skip routes we already have cached
    const needed = destinations.filter((d) => !get().routes.has(`${homestay.id}:${d.id}`));
    if (needed.length === 0) return;

    set({ routesLoading: true });

    const tasks = needed.map((dest) => async () => {
      try {
        const res = await fetch(`/api/routes?from=${homestay.lat},${homestay.lon}&to=${dest.lat},${dest.lon}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.geometry) return null;
        return { key: `${homestay.id}:${dest.id}`, points: data.geometry as [number, number][] };
      } catch {
        return null;
      }
    });

    const results = await limitConcurrency(tasks, 3);

    // Merge with current state at write time to avoid race condition
    const merged = new Map(get().routes);
    for (const r of results) {
      if (r) merged.set(r.key, r.points);
    }

    set({ routes: merged, routesLoading: false });
  },

  clearDistances: () => set({ distances: new Map(), loading: false, error: null, _lastCoordHash: "" }),

  clear: () => set({ distances: new Map(), routes: new Map(), loading: false, routesLoading: false, error: null, _lastCoordHash: "" }),
}));
