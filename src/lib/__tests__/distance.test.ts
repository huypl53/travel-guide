import { describe, it, expect } from "vitest";
import { haversineKm } from "@/lib/distance";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(11.9404, 108.4583, 11.9404, 108.4583)).toBe(0);
  });

  it("calculates Da Lat to Nha Trang (~87km)", () => {
    const km = haversineKm(11.9404, 108.4583, 12.2388, 109.1967);
    expect(km).toBeGreaterThan(80);
    expect(km).toBeLessThan(95);
  });

  it("calculates short distance (~1km)", () => {
    const km = haversineKm(11.9404, 108.4583, 11.9465, 108.4485);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(2);
  });
});
