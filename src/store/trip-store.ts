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
  notes?: string | null;
  photoUrl?: string | null;
}

interface TripState {
  tripName: string;
  locations: Location[];
  selectedHomestayId: string | null;
  focusedLocation: { lat: number; lon: number } | null;
  selectedHomestayIds: Set<string>;
  selectedDestinationIds: Set<string>;
  comparisonIds: string[];
  setTripName: (name: string) => void;
  addLocation: (input: AddLocationInput) => void;
  removeLocation: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  updateLocationNotes: (id: string, notes: string) => void;
  updateLocationPhoto: (id: string, photoUrl: string) => void;
  setSelectedHomestay: (id: string | null) => void;
  setFocusedLocation: (loc: { lat: number; lon: number } | null) => void;
  toggleLocationSelection: (id: string) => void;
  selectAllByType: (type: LocationType) => void;
  deselectAllByType: (type: LocationType) => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  tripName: "",
  locations: [],
  selectedHomestayId: null,
  focusedLocation: null,
  selectedHomestayIds: new Set<string>(),
  selectedDestinationIds: new Set<string>(),
  comparisonIds: [],

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
      notes: input.notes ?? null,
      photoUrl: input.photoUrl ?? null,
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
        comparisonIds: state.comparisonIds.filter((cid) => cid !== id),
      };
    }),

  updatePriority: (id, priority) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, priority } : l,
      ),
    })),

  updateLocationNotes: (id, notes) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, notes: notes || null } : l,
      ),
    })),

  updateLocationPhoto: (id, photoUrl) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, photoUrl: photoUrl || null } : l,
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

  toggleComparison: (id) =>
    set((state) => {
      const idx = state.comparisonIds.indexOf(id);
      if (idx >= 0) {
        return { comparisonIds: state.comparisonIds.filter((cid) => cid !== id) };
      }
      if (state.comparisonIds.length >= 3) return {};
      return { comparisonIds: [...state.comparisonIds, id] };
    }),

  clearComparison: () => set({ comparisonIds: [] }),

  reset: () => set({ tripName: "", locations: [], selectedHomestayId: null, focusedLocation: null, selectedHomestayIds: new Set(), selectedDestinationIds: new Set(), comparisonIds: [] }),
}));
