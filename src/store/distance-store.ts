import { create } from "zustand";
import type { Location } from "@/lib/types";

export interface DrivingDistance {
  drivingKm: number;
  drivingMinutes: number;
}

interface DistanceState {
  distances: Map<string, DrivingDistance>;
  loading: boolean;
  error: string | null;
  fetchDistances: (homestays: Location[], destinations: Location[]) => Promise<void>;
  clear: () => void;
}

export const useDistanceStore = create<DistanceState>((set) => ({
  distances: new Map(),
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

  clear: () => set({ distances: new Map(), loading: false, error: null }),
}));
