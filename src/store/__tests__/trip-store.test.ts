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
});
