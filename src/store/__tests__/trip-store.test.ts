import { describe, it, expect, beforeEach } from "vitest";
import { useTripStore } from "@/store/trip-store";

describe("tripStore", () => {
  beforeEach(() => {
    useTripStore.getState().reset();
  });

  it("starts with empty locations", () => {
    const state = useTripStore.getState();
    expect(state.locations.filter((l) => l.type === "homestay")).toEqual([]);
    expect(state.locations.filter((l) => l.type === "destination")).toEqual([]);
  });

  it("adds a homestay", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa Rose",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const homestays = useTripStore
      .getState()
      .locations.filter((l) => l.type === "homestay");
    expect(homestays).toHaveLength(1);
    expect(homestays[0].name).toBe("Villa Rose");
  });

  it("adds a destination with priority", () => {
    useTripStore.getState().addLocation({
      type: "destination",
      name: "Crazy House",
      lat: 11.93,
      lon: 108.43,
      address: null,
      source: "manual",
      priority: 5,
    });
    const dests = useTripStore
      .getState()
      .locations.filter((l) => l.type === "destination");
    expect(dests).toHaveLength(1);
    expect(dests[0].priority).toBe(5);
  });

  it("removes a location", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    useTripStore.getState().removeLocation(id);
    expect(useTripStore.getState().locations).toHaveLength(0);
  });

  it("updates destination priority", () => {
    useTripStore.getState().addLocation({
      type: "destination",
      name: "Dest",
      lat: 11.93,
      lon: 108.43,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    useTripStore.getState().updatePriority(id, 5);
    expect(useTripStore.getState().locations[0].priority).toBe(5);
  });

  it("sets selected homestay", () => {
    useTripStore.getState().setSelectedHomestay("h1");
    expect(useTripStore.getState().selectedHomestayId).toBe("h1");
  });

  it("new location is auto-added to selection set", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(true);
  });

  it("new destination is auto-added to selection set", () => {
    useTripStore.getState().addLocation({
      type: "destination",
      name: "Dest",
      lat: 11.93,
      lon: 108.43,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    expect(useTripStore.getState().selectedDestinationIds.has(id)).toBe(true);
  });

  it("removed location is removed from selection set", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    useTripStore.getState().removeLocation(id);
    expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(false);
  });

  it("toggleLocationSelection toggles selection", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().locations[0].id;
    useTripStore.getState().toggleLocationSelection(id);
    expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(false);
    useTripStore.getState().toggleLocationSelection(id);
    expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(true);
  });

  it("selectAllByType selects all of a type", () => {
    useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
    useTripStore.getState().addLocation({ type: "homestay", name: "B", lat: 2, lon: 2, address: null, source: "manual" });
    const ids = useTripStore.getState().locations.map((l) => l.id);
    // Deselect all first
    ids.forEach((id) => useTripStore.getState().toggleLocationSelection(id));
    expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
    // Select all
    useTripStore.getState().selectAllByType("homestay");
    expect(useTripStore.getState().selectedHomestayIds.size).toBe(2);
  });

  it("deselectAllByType deselects all of a type", () => {
    useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
    useTripStore.getState().addLocation({ type: "homestay", name: "B", lat: 2, lon: 2, address: null, source: "manual" });
    useTripStore.getState().deselectAllByType("homestay");
    expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
  });

  it("reset clears selection sets", () => {
    useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
    useTripStore.getState().reset();
    expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
    expect(useTripStore.getState().selectedDestinationIds.size).toBe(0);
  });
});
