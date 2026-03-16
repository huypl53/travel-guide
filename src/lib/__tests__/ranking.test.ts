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
