import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Location, LocationType, LocationSource, CollabDelta, CollabParticipant } from "@/lib/types";

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

type SyncStatus = "connecting" | "connected" | "syncing" | "offline";

interface CollabState {
  sessionSlug: string;
  tripName: string;
  locations: Location[];
  participants: CollabParticipant[];
  syncStatus: SyncStatus;
  selectedHomestayId: string | null;
  focusedLocation: { lat: number; lon: number } | null;
  selectedHomestayIds: Set<string>;
  selectedDestinationIds: Set<string>;
  comparisonIds: string[];

  // Broadcast callback — set by the hook
  _broadcast: ((delta: CollabDelta) => void) | null;
  setBroadcast: (fn: ((delta: CollabDelta) => void) | null) => void;

  // Session init
  initSession: (slug: string, tripName: string, locations: Location[]) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setParticipants: (participants: CollabParticipant[]) => void;

  // Mutations (broadcast deltas)
  setTripName: (name: string) => void;
  addLocation: (input: AddLocationInput) => void;
  removeLocation: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  updateLocationNotes: (id: string, notes: string) => void;
  updateLocationPhoto: (id: string, photoUrl: string) => void;

  // Remote delta application (no re-broadcast)
  applyRemoteDelta: (delta: CollabDelta) => void;

  // UI-only (no broadcast needed)
  setSelectedHomestay: (id: string | null) => void;
  setFocusedLocation: (loc: { lat: number; lon: number } | null) => void;
  toggleLocationSelection: (id: string) => void;
  selectAllByType: (type: LocationType) => void;
  deselectAllByType: (type: LocationType) => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  reset: () => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  sessionSlug: "",
  tripName: "",
  locations: [],
  participants: [],
  syncStatus: "connecting",
  selectedHomestayId: null,
  focusedLocation: null,
  selectedHomestayIds: new Set<string>(),
  selectedDestinationIds: new Set<string>(),
  comparisonIds: [],
  _broadcast: null,

  setBroadcast: (fn) => set({ _broadcast: fn }),

  initSession: (slug, tripName, locations) =>
    set({
      sessionSlug: slug,
      tripName,
      locations,
      selectedHomestayIds: new Set(locations.filter((l) => l.type === "homestay").map((l) => l.id)),
      selectedDestinationIds: new Set(locations.filter((l) => l.type === "destination").map((l) => l.id)),
    }),

  setSyncStatus: (status) => set({ syncStatus: status }),
  setParticipants: (participants) => set({ participants }),

  setTripName: (name) => {
    set({ tripName: name });
    get()._broadcast?.({ action: "set-trip-name", name });
  },

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
    get()._broadcast?.({ action: "add-location", location });
  },

  removeLocation: (id) => {
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
    });
    get()._broadcast?.({ action: "remove-location", locationId: id });
  },

  updatePriority: (id, priority) => {
    set((state) => ({
      locations: state.locations.map((l) => (l.id === id ? { ...l, priority } : l)),
    }));
    get()._broadcast?.({ action: "update-priority", locationId: id, priority });
  },

  updateLocationNotes: (id, notes) => {
    set((state) => ({
      locations: state.locations.map((l) => (l.id === id ? { ...l, notes: notes || null } : l)),
    }));
    get()._broadcast?.({ action: "update-notes", locationId: id, notes });
  },

  updateLocationPhoto: (id, photoUrl) => {
    set((state) => ({
      locations: state.locations.map((l) => (l.id === id ? { ...l, photoUrl: photoUrl || null } : l)),
    }));
    get()._broadcast?.({ action: "update-photo", locationId: id, photoUrl });
  },

  applyRemoteDelta: (delta) => {
    switch (delta.action) {
      case "set-trip-name":
        set({ tripName: delta.name });
        break;
      case "add-location": {
        const loc = delta.location;
        set((state) => {
          if (state.locations.some((l) => l.id === loc.id)) return {};
          const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
          const newSet = new Set(state[setKey]);
          newSet.add(loc.id);
          return { locations: [...state.locations, loc], [setKey]: newSet };
        });
        break;
      }
      case "remove-location":
        set((state) => {
          const loc = state.locations.find((l) => l.id === delta.locationId);
          if (!loc) return {};
          const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
          const newSet = new Set(state[setKey]);
          newSet.delete(delta.locationId);
          return {
            locations: state.locations.filter((l) => l.id !== delta.locationId),
            [setKey]: newSet,
            comparisonIds: state.comparisonIds.filter((cid) => cid !== delta.locationId),
          };
        });
        break;
      case "update-priority":
        set((state) => ({
          locations: state.locations.map((l) =>
            l.id === delta.locationId ? { ...l, priority: delta.priority } : l
          ),
        }));
        break;
      case "update-notes":
        set((state) => ({
          locations: state.locations.map((l) =>
            l.id === delta.locationId ? { ...l, notes: delta.notes || null } : l
          ),
        }));
        break;
      case "update-photo":
        set((state) => ({
          locations: state.locations.map((l) =>
            l.id === delta.locationId ? { ...l, photoUrl: delta.photoUrl || null } : l
          ),
        }));
        break;
      case "full-sync":
        set({
          tripName: delta.tripName,
          locations: delta.locations,
          selectedHomestayIds: new Set(delta.locations.filter((l) => l.type === "homestay").map((l) => l.id)),
          selectedDestinationIds: new Set(delta.locations.filter((l) => l.type === "destination").map((l) => l.id)),
        });
        break;
    }
  },

  // UI-only state (same as trip-store, no broadcast)
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
      if (idx >= 0) return { comparisonIds: state.comparisonIds.filter((cid) => cid !== id) };
      if (state.comparisonIds.length >= 3) return {};
      return { comparisonIds: [...state.comparisonIds, id] };
    }),

  clearComparison: () => set({ comparisonIds: [] }),

  reset: () =>
    set({
      sessionSlug: "",
      tripName: "",
      locations: [],
      participants: [],
      syncStatus: "connecting",
      selectedHomestayId: null,
      focusedLocation: null,
      selectedHomestayIds: new Set(),
      selectedDestinationIds: new Set(),
      comparisonIds: [],
      _broadcast: null,
    }),
}));
