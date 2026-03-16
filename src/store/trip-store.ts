import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Location, LocationType, LocationSource } from "@/lib/types";

interface AddLocationInput {
  type: LocationType;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  source: LocationSource;
  priority?: number;
}

interface TripState {
  tripName: string;
  locations: Location[];
  selectedHomestayId: string | null;
  focusedLocation: { lat: number; lon: number } | null;
  setTripName: (name: string) => void;
  addLocation: (input: AddLocationInput) => void;
  removeLocation: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  setSelectedHomestay: (id: string | null) => void;
  setFocusedLocation: (loc: { lat: number; lon: number } | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  tripName: "",
  locations: [],
  selectedHomestayId: null,
  focusedLocation: null,

  setTripName: (name) => set({ tripName: name }),

  addLocation: (input) => {
    const location: Location = {
      id: nanoid(),
      tripId: "",
      type: input.type,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lon: input.lon,
      priority: input.priority ?? 3,
      source: input.source,
    };
    set((state) => ({ locations: [...state.locations, location] }));
  },

  removeLocation: (id) =>
    set((state) => ({
      locations: state.locations.filter((l) => l.id !== id),
    })),

  updatePriority: (id, priority) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, priority } : l,
      ),
    })),

  setSelectedHomestay: (id) => set({ selectedHomestayId: id }),

  setFocusedLocation: (loc) => set({ focusedLocation: loc }),

  reset: () => set({ tripName: "", locations: [], selectedHomestayId: null, focusedLocation: null }),
}));
