import { create } from "zustand";

export type TransportMode = "motorbike" | "car";

const FUEL_COST_DEFAULTS: Record<TransportMode, number> = {
  motorbike: 3000,
  car: 6000,
};

interface CostState {
  nightlyRates: Record<string, number>; // baseId -> VND per night
  tripNights: number;
  transportMode: TransportMode;
  fuelCostPerKm: number;
  setNightlyRate: (baseId: string, rate: number) => void;
  removeNightlyRate: (baseId: string) => void;
  setTripNights: (nights: number) => void;
  setTransportMode: (mode: TransportMode) => void;
  loadFromStorage: (slug: string) => void;
  saveToStorage: (slug: string) => void;
}

export const useCostStore = create<CostState>((set, get) => ({
  nightlyRates: {},
  tripNights: 1,
  transportMode: "motorbike",
  fuelCostPerKm: FUEL_COST_DEFAULTS.motorbike,

  setNightlyRate: (baseId, rate) => {
    set((state) => ({
      nightlyRates: { ...state.nightlyRates, [baseId]: rate },
    }));
  },

  removeNightlyRate: (baseId) => {
    set((state) => {
      const { [baseId]: _removed, ...rest } = state.nightlyRates;
      return { nightlyRates: rest };
    });
  },

  setTripNights: (nights) => set({ tripNights: Math.max(1, nights) }),

  setTransportMode: (mode) =>
    set({ transportMode: mode, fuelCostPerKm: FUEL_COST_DEFAULTS[mode] }),

  loadFromStorage: (slug) => {
    try {
      const raw = localStorage.getItem(`cost-settings-${slug}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      const mode: TransportMode = data.transportMode ?? "motorbike";
      set({
        nightlyRates: data.nightlyRates ?? {},
        tripNights: data.tripNights ?? 1,
        transportMode: mode,
        fuelCostPerKm: FUEL_COST_DEFAULTS[mode],
      });
    } catch {
      // ignore corrupt data
    }
  },

  saveToStorage: (slug) => {
    const { nightlyRates, tripNights, transportMode } = get();
    try {
      localStorage.setItem(
        `cost-settings-${slug}`,
        JSON.stringify({ nightlyRates, tripNights, transportMode })
      );
    } catch {
      // storage full — ignore
    }
  },
}));
