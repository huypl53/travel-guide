import { create } from "zustand";
import type { Location } from "@/lib/types";
import { buildOsrmRouteUrl, decodePolyline } from "@/lib/osrm";

export interface DrivingDistance {
  drivingKm: number;
  drivingMinutes: number;
}

interface DistanceState {
  distances: Map<string, DrivingDistance>;
  routes: Map<string, [number, number][]>;
  routesLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchDistances: (homestays: Location[], destinations: Location[]) => Promise<void>;
  fetchRoutes: (homestay: Location, destinations: Location[]) => Promise<void>;
  clear: () => void;
}

export const useDistanceStore = create<DistanceState>((set, get) => ({
  distances: new Map(),
  routes: new Map(),
  routesLoading: false,
  loading: false,
  error: null,

  fetchDistances: async (homestays, destinations) => {
    if (homestays.length === 0 || destinations.length === 0) {
      set({ distances: new Map(), loading: false });
      return;
    }

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

      set({ distances: newDistances, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchRoutes: async (homestay, destinations) => {
    if (destinations.length === 0) return;

    // Skip routes we already have cached
    const cached = get().routes;
    const needed = destinations.filter((d) => !cached.has(`${homestay.id}:${d.id}`));
    if (needed.length === 0) return;

    set({ routesLoading: true });

    const newRoutes = new Map(cached);

    await Promise.all(
      needed.map(async (dest) => {
        try {
          const url = buildOsrmRouteUrl(
            { lat: homestay.lat, lon: homestay.lon },
            { lat: dest.lat, lon: dest.lon }
          );
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          if (data.code !== "Ok" || !data.routes?.[0]?.geometry) return;
          const points = decodePolyline(data.routes[0].geometry);
          newRoutes.set(`${homestay.id}:${dest.id}`, points);
        } catch {
          // Skip failed routes — straight line fallback
        }
      })
    );

    set({ routes: newRoutes, routesLoading: false });
  },

  clear: () => set({ distances: new Map(), routes: new Map(), loading: false, routesLoading: false, error: null }),
}));
