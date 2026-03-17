import { create } from "zustand";

export type TransportMode = "motorbike" | "car";

const FUEL_COST_DEFAULTS: Record<TransportMode, number> = {
  motorbike: 3000,
  car: 6000,
};

interface CostState {
  nightlyRates: Record<string, number>; // homestayId -> VND per night
  tripNights: number;
  transportMode: TransportMode;
  fuelCostPerKm: number;
  setNightlyRate: (homestayId: string, rate: number) => void;
  removeNightlyRate: (homestayId: string) => void;
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

  setNightlyRate: (homestayId, rate) => {
    set((state) => ({
      nightlyRates: { ...state.nightlyRates, [homestayId]: rate },
    }));
  },

  removeNightlyRate: (homestayId) => {
    set((state) => {
      const { [homestayId]: _, ...rest } = state.nightlyRates;
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
      set({
        nightlyRates: data.nightlyRates ?? {},
        tripNights: data.tripNights ?? 1,
        transportMode: data.transportMode ?? "motorbike",
        fuelCostPerKm:
          data.fuelCostPerKm ??
          FUEL_COST_DEFAULTS[(data.transportMode ?? "motorbike") as TransportMode],
      });
    } catch {
      // ignore corrupt data
    }
  },

  saveToStorage: (slug) => {
    const { nightlyRates, tripNights, transportMode, fuelCostPerKm } = get();
    try {
      localStorage.setItem(
        `cost-settings-${slug}`,
        JSON.stringify({ nightlyRates, tripNights, transportMode, fuelCostPerKm })
      );
    } catch {
      // storage full — ignore
    }
  },
}));
