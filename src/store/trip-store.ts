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
  selectedHomestayIds: Set<string>;
  selectedDestinationIds: Set<string>;
  setTripName: (name: string) => void;
  addLocation: (input: AddLocationInput) => void;
  removeLocation: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  setSelectedHomestay: (id: string | null) => void;
  setFocusedLocation: (loc: { lat: number; lon: number } | null) => void;
  toggleLocationSelection: (id: string) => void;
  selectAllByType: (type: LocationType) => void;
  deselectAllByType: (type: LocationType) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  tripName: "",
  locations: [],
  selectedHomestayId: null,
  focusedLocation: null,
  selectedHomestayIds: new Set<string>(),
  selectedDestinationIds: new Set<string>(),

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
    set((state) => {
      const setKey = input.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
      const newSet = new Set(state[setKey]);
      newSet.add(location.id);
      return { locations: [...state.locations, location], [setKey]: newSet };
    });
  },

  removeLocation: (id) =>
    set((state) => {
      const loc = state.locations.find((l) => l.id === id);
      if (!loc) return { locations: state.locations };
      const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
      const newSet = new Set(state[setKey]);
      newSet.delete(id);
      return {
        locations: state.locations.filter((l) => l.id !== id),
        [setKey]: newSet,
      };
    }),

  updatePriority: (id, priority) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, priority } : l,
      ),
    })),

  setSelectedHomestay: (id) => set({ selectedHomestayId: id }),

  setFocusedLocation: (loc) => set({ focusedLocation: loc }),

  toggleLocationSelection: (id) =>
    set((state) => {
      const loc = state.locations.find((l) => l.id === id);
      if (!loc) return {};
      const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
      const newSet = new Set(state[setKey]);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { [setKey]: newSet };
    }),

  selectAllByType: (type) =>
    set((state) => {
      const setKey = type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
      const ids = state.locations.filter((l) => l.type === type).map((l) => l.id);
      return { [setKey]: new Set(ids) };
    }),

  deselectAllByType: (type) =>
    set(() => {
      const setKey = type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
      return { [setKey]: new Set<string>() };
    }),

  reset: () => set({ tripName: "", locations: [], selectedHomestayId: null, focusedLocation: null, selectedHomestayIds: new Set(), selectedDestinationIds: new Set() }),
}));
