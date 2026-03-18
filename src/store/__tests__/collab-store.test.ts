import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCollabStore } from "@/store/collab-store";
import type { Location, CollabDelta } from "@/lib/types";

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    tripId: "",
    type: "homestay",
    name: "Test Homestay",
    address: null,
    lat: 11.94,
    lon: 108.45,
    priority: 3,
    source: "manual",
    notes: null,
    photoUrl: null,
    ...overrides,
  };
}

describe("collab-store", () => {
  beforeEach(() => {
    useCollabStore.getState().reset();
  });

  describe("initSession", () => {
    it("sets slug, tripName, and locations", () => {
      const locations = [makeLocation(), makeLocation({ id: "loc-2", type: "destination", name: "Beach" })];
      useCollabStore.getState().initSession("abc123", "My Trip", locations);

      const state = useCollabStore.getState();
      expect(state.sessionSlug).toBe("abc123");
      expect(state.tripName).toBe("My Trip");
      expect(state.locations).toHaveLength(2);
      expect(state.selectedHomestayIds.has("loc-1")).toBe(true);
      expect(state.selectedDestinationIds.has("loc-2")).toBe(true);
    });
  });

  describe("mutations broadcast deltas", () => {
    it("setTripName broadcasts", () => {
      const broadcast = vi.fn();
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().setTripName("New Name");

      expect(useCollabStore.getState().tripName).toBe("New Name");
      expect(broadcast).toHaveBeenCalledWith({ action: "set-trip-name", name: "New Name" });
    });

    it("addLocation broadcasts with location data", () => {
      const broadcast = vi.fn();
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().addLocation({
        type: "homestay",
        name: "Test",
        lat: 11,
        lon: 108,
        address: null,
        source: "manual",
      });

      expect(useCollabStore.getState().locations).toHaveLength(1);
      expect(broadcast).toHaveBeenCalledTimes(1);
      const delta = broadcast.mock.calls[0][0] as CollabDelta;
      expect(delta.action).toBe("add-location");
      if (delta.action === "add-location") {
        expect(delta.location.name).toBe("Test");
        expect(delta.location.type).toBe("homestay");
      }
    });

    it("removeLocation broadcasts", () => {
      const broadcast = vi.fn();
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().removeLocation("loc-1");

      expect(useCollabStore.getState().locations).toHaveLength(0);
      expect(broadcast).toHaveBeenCalledWith({ action: "remove-location", locationId: "loc-1" });
    });

    it("updatePriority broadcasts", () => {
      const broadcast = vi.fn();
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().updatePriority("loc-1", 5);

      expect(useCollabStore.getState().locations[0].priority).toBe(5);
      expect(broadcast).toHaveBeenCalledWith({ action: "update-priority", locationId: "loc-1", priority: 5 });
    });

    it("updateLocationNotes broadcasts", () => {
      const broadcast = vi.fn();
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().updateLocationNotes("loc-1", "Great view");

      expect(useCollabStore.getState().locations[0].notes).toBe("Great view");
      expect(broadcast).toHaveBeenCalledWith({ action: "update-notes", locationId: "loc-1", notes: "Great view" });
    });

    it("updateLocationPhoto broadcasts", () => {
      const broadcast = vi.fn();
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().updateLocationPhoto("loc-1", "https://example.com/photo.jpg");

      expect(useCollabStore.getState().locations[0].photoUrl).toBe("https://example.com/photo.jpg");
      expect(broadcast).toHaveBeenCalledWith({ action: "update-photo", locationId: "loc-1", photoUrl: "https://example.com/photo.jpg" });
    });

    it("does not broadcast when no broadcast callback set", () => {
      useCollabStore.getState().setTripName("Test");
      // No error thrown, just silently skips
      expect(useCollabStore.getState().tripName).toBe("Test");
    });
  });

  describe("applyRemoteDelta", () => {
    it("applies set-trip-name", () => {
      useCollabStore.getState().applyRemoteDelta({ action: "set-trip-name", name: "Remote Name" });
      expect(useCollabStore.getState().tripName).toBe("Remote Name");
    });

    it("applies add-location", () => {
      const loc = makeLocation({ id: "remote-loc" });
      useCollabStore.getState().applyRemoteDelta({ action: "add-location", location: loc });

      expect(useCollabStore.getState().locations).toHaveLength(1);
      expect(useCollabStore.getState().locations[0].id).toBe("remote-loc");
      expect(useCollabStore.getState().selectedHomestayIds.has("remote-loc")).toBe(true);
    });

    it("deduplicates add-location with same id", () => {
      const loc = makeLocation({ id: "dup-loc" });
      useCollabStore.getState().applyRemoteDelta({ action: "add-location", location: loc });
      useCollabStore.getState().applyRemoteDelta({ action: "add-location", location: loc });

      expect(useCollabStore.getState().locations).toHaveLength(1);
    });

    it("applies remove-location", () => {
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().applyRemoteDelta({ action: "remove-location", locationId: "loc-1" });
      expect(useCollabStore.getState().locations).toHaveLength(0);
    });

    it("applies update-priority", () => {
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().applyRemoteDelta({ action: "update-priority", locationId: "loc-1", priority: 1 });
      expect(useCollabStore.getState().locations[0].priority).toBe(1);
    });

    it("applies update-notes", () => {
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().applyRemoteDelta({ action: "update-notes", locationId: "loc-1", notes: "Remote note" });
      expect(useCollabStore.getState().locations[0].notes).toBe("Remote note");
    });

    it("applies update-photo", () => {
      useCollabStore.setState({ locations: [makeLocation()] });
      useCollabStore.getState().applyRemoteDelta({ action: "update-photo", locationId: "loc-1", photoUrl: "https://img.com/1.jpg" });
      expect(useCollabStore.getState().locations[0].photoUrl).toBe("https://img.com/1.jpg");
    });

    it("applies full-sync", () => {
      const locations = [makeLocation({ id: "sync-1" }), makeLocation({ id: "sync-2", type: "destination" })];
      useCollabStore.getState().applyRemoteDelta({ action: "full-sync", tripName: "Synced Trip", locations });

      const state = useCollabStore.getState();
      expect(state.tripName).toBe("Synced Trip");
      expect(state.locations).toHaveLength(2);
      expect(state.selectedHomestayIds.has("sync-1")).toBe(true);
      expect(state.selectedDestinationIds.has("sync-2")).toBe(true);
    });

    it("does not re-broadcast when applying remote delta", () => {
      const broadcast = vi.fn();
      useCollabStore.getState().setBroadcast(broadcast);
      useCollabStore.getState().applyRemoteDelta({ action: "set-trip-name", name: "Remote" });

      // applyRemoteDelta should NOT call broadcast
      expect(broadcast).not.toHaveBeenCalled();
    });
  });

  describe("UI-only state", () => {
    it("toggleComparison respects max 3 limit", () => {
      useCollabStore.getState().toggleComparison("a");
      useCollabStore.getState().toggleComparison("b");
      useCollabStore.getState().toggleComparison("c");
      useCollabStore.getState().toggleComparison("d"); // should be ignored

      expect(useCollabStore.getState().comparisonIds).toEqual(["a", "b", "c"]);
    });

    it("reset clears all state", () => {
      useCollabStore.getState().initSession("slug", "Trip", [makeLocation()]);
      useCollabStore.getState().reset();

      const state = useCollabStore.getState();
      expect(state.sessionSlug).toBe("");
      expect(state.locations).toHaveLength(0);
      expect(state.participants).toHaveLength(0);
      expect(state._broadcast).toBeNull();
    });
  });
});
