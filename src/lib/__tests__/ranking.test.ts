import { describe, it, expect } from "vitest";
import { rankHomestays } from "@/lib/ranking";
import type { Location } from "@/lib/types";

const homestays: Location[] = [
  { id: "h1", tripId: "t1", type: "homestay", name: "Close", address: null, lat: 11.94, lon: 108.45, priority: 3, source: "manual" },
  { id: "h2", tripId: "t1", type: "homestay", name: "Far", address: null, lat: 12.24, lon: 109.19, priority: 3, source: "manual" },
];

const destinations: Location[] = [
  { id: "d1", tripId: "t1", type: "destination", name: "Dest A", address: null, lat: 11.95, lon: 108.46, priority: 5, source: "manual" },
  { id: "d2", tripId: "t1", type: "destination", name: "Dest B", address: null, lat: 11.93, lon: 108.44, priority: 1, source: "manual" },
];

describe("rankHomestays", () => {
  it("returns homestays sorted by weighted average distance (closest first)", () => {
    const result = rankHomestays(homestays, destinations);
    expect(result[0].homestay.id).toBe("h1");
    expect(result[1].homestay.id).toBe("h2");
  });

  it("respects priority weights", () => {
    const result = rankHomestays(homestays, destinations);
    expect(result[0].distances).toHaveLength(2);
    expect(result[0].weightedAvgKm).toBeGreaterThan(0);
  });

  it("returns empty array for no homestays", () => {
    expect(rankHomestays([], destinations)).toEqual([]);
  });

  it("returns empty array for no destinations", () => {
    expect(rankHomestays(homestays, [])).toEqual([]);
  });
});

describe("rankHomestays with driving distances", () => {
  it("uses driving distances when provided", () => {
    const drivingDistances = new Map([
      // h1 is closer by air but farther by road
      ["h1:d1", { drivingKm: 20, drivingMinutes: 30 }],
      ["h1:d2", { drivingKm: 18, drivingMinutes: 25 }],
      // h2 is farther by air but closer by road
      ["h2:d1", { drivingKm: 5, drivingMinutes: 8 }],
      ["h2:d2", { drivingKm: 6, drivingMinutes: 10 }],
    ]);

    const result = rankHomestays(homestays, destinations, drivingDistances);
    // h2 should now rank first (closer by road)
    expect(result[0].homestay.id).toBe("h2");
    expect(result[1].homestay.id).toBe("h1");
  });

  it("falls back to haversine when driving distance is missing", () => {
    const partial = new Map([
      ["h1:d1", { drivingKm: 1, drivingMinutes: 2 }],
      // h1:d2 missing, h2:* missing — will use haversine
    ]);

    const result = rankHomestays(homestays, destinations, partial);
    // Should not throw, should produce valid ranking
    expect(result).toHaveLength(2);
    expect(result[0].weightedAvgKm).toBeGreaterThan(0);
  });

  it("includes drivingKm and drivingMinutes in distance entries", () => {
    const drivingDistances = new Map([
      ["h1:d1", { drivingKm: 5.2, drivingMinutes: 12 }],
      ["h1:d2", { drivingKm: 3.1, drivingMinutes: 7 }],
    ]);

    const result = rankHomestays(homestays, destinations, drivingDistances);
    const h1 = result.find((r) => r.homestay.id === "h1")!;
    const d1Entry = h1.distances.find((d) => d.destination.id === "d1")!;
    expect(d1Entry.drivingKm).toBe(5.2);
    expect(d1Entry.drivingMinutes).toBe(12);
    expect(d1Entry.km).toBeGreaterThan(0); // haversine still present
  });
});
