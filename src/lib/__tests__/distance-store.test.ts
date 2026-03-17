import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDistanceStore } from "@/store/distance-store";
import type { Location } from "@/lib/types";

const homestays: Location[] = [
  { id: "h1", tripId: "t1", type: "homestay", name: "H1", address: null, lat: 11.94, lon: 108.45, priority: 3, source: "manual", notes: null, photoUrl: null },
];

const destinations: Location[] = [
  { id: "d1", tripId: "t1", type: "destination", name: "D1", address: null, lat: 11.95, lon: 108.46, priority: 5, source: "manual", notes: null, photoUrl: null },
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

  it("limits concurrent route fetches to 3", async () => {
    let activeRequests = 0;
    let maxActive = 0;

    global.fetch = vi.fn(() => {
      activeRequests++;
      maxActive = Math.max(maxActive, activeRequests);
      return new Promise((resolve) =>
        setTimeout(() => {
          activeRequests--;
          resolve(new Response(JSON.stringify({ geometry: [[1, 2]] }), { status: 200 }));
        }, 50)
      );
    }) as unknown as typeof fetch;

    const homestay = { id: "h1", tripId: "", type: "homestay" as const, name: "H", lat: 1, lon: 1, address: null, priority: 3, source: "manual" as const, notes: null, photoUrl: null };
    const dests = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`, tripId: "", type: "destination" as const, name: `D${i}`, lat: i, lon: i, address: null, priority: 3, source: "manual" as const, notes: null, photoUrl: null,
    }));

    await useDistanceStore.getState().fetchRoutes(homestay, dests);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
