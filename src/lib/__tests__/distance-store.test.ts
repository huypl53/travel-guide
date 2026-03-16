import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDistanceStore } from "@/store/distance-store";
import type { Location } from "@/lib/types";

const homestays: Location[] = [
  { id: "h1", tripId: "t1", type: "homestay", name: "H1", address: null, lat: 11.94, lon: 108.45, priority: 3, source: "manual" },
];

const destinations: Location[] = [
  { id: "d1", tripId: "t1", type: "destination", name: "D1", address: null, lat: 11.95, lon: 108.46, priority: 5, source: "manual" },
];

const originalFetch = global.fetch;

beforeEach(() => {
  useDistanceStore.getState().clear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("useDistanceStore", () => {
  it("starts with empty distances and loading false", () => {
    const state = useDistanceStore.getState();
    expect(state.distances.size).toBe(0);
    expect(state.loading).toBe(false);
  });

  it("fetchDistances populates the distances map", async () => {
    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        matrix: [[{ distanceKm: 5.2, durationMinutes: 12 }]],
      }),
    });

    await useDistanceStore.getState().fetchDistances(homestays, destinations);

    const state = useDistanceStore.getState();
    expect(state.distances.get("h1:d1")).toEqual({
      drivingKm: 5.2,
      drivingMinutes: 12,
    });
    expect(state.loading).toBe(false);
  });

  it("clear resets distances", () => {
    useDistanceStore.setState({
      distances: new Map([["h1:d1", { drivingKm: 5, drivingMinutes: 10 }]]),
    });
    useDistanceStore.getState().clear();
    expect(useDistanceStore.getState().distances.size).toBe(0);
  });
});
