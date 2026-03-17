import { describe, it, expect, vi } from "vitest";
import { withFallback } from "../fallback";
import type { GeocodingProvider, RoutingProvider } from "../types";

function mockGeocodingProvider(name: string): GeocodingProvider {
  return {
    name,
    search: vi.fn(),
  };
}

function mockRoutingProvider(name: string): RoutingProvider {
  return {
    name,
    getDistanceMatrix: vi.fn(),
    getRoute: vi.fn(),
  };
}

describe("withFallback", () => {
  describe("geocoding", () => {
    it("returns primary result on success, fallback not called", async () => {
      const primary = mockGeocodingProvider("primary");
      const fallback = mockGeocodingProvider("fallback");
      const expected = [{ name: "Place A", lat: 10, lon: 106 }];
      vi.mocked(primary.search).mockResolvedValue(expected);

      const wrapped = withFallback.geocoding(primary, fallback);
      const result = await wrapped.search("test");

      expect(result).toBe(expected);
      expect(primary.search).toHaveBeenCalledWith("test", undefined);
      expect(fallback.search).not.toHaveBeenCalled();
      expect(wrapped.name).toBe("primary+fallback");
    });

    it("falls back on primary failure, returns fallback result", async () => {
      const primary = mockGeocodingProvider("primary");
      const fallback = mockGeocodingProvider("fallback");
      const expected = [{ name: "Place B", lat: 21, lon: 105 }];
      vi.mocked(primary.search).mockRejectedValue(new Error("network error"));
      vi.mocked(fallback.search).mockResolvedValue(expected);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapped = withFallback.geocoding(primary, fallback);
      const result = await wrapped.search("query", { country: "vn" });

      expect(result).toBe(expected);
      expect(fallback.search).toHaveBeenCalledWith("query", { country: "vn" });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("primary geocoding failed"),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });

  describe("routing", () => {
    describe("getDistanceMatrix", () => {
      it("returns primary result on success", async () => {
        const primary = mockRoutingProvider("primary");
        const fallback = mockRoutingProvider("fallback");
        const sources = [{ lat: 10, lon: 106 }];
        const destinations = [{ lat: 21, lon: 105 }];
        const expected = [[{ distanceKm: 1700, durationMinutes: 1200 }]];
        vi.mocked(primary.getDistanceMatrix).mockResolvedValue(expected);

        const wrapped = withFallback.routing(primary, fallback);
        const result = await wrapped.getDistanceMatrix(sources, destinations);

        expect(result).toBe(expected);
        expect(primary.getDistanceMatrix).toHaveBeenCalledWith(sources, destinations);
        expect(fallback.getDistanceMatrix).not.toHaveBeenCalled();
        expect(wrapped.name).toBe("primary+fallback");
      });

      it("falls back on primary failure", async () => {
        const primary = mockRoutingProvider("primary");
        const fallback = mockRoutingProvider("fallback");
        const sources = [{ lat: 10, lon: 106 }];
        const destinations = [{ lat: 21, lon: 105 }];
        const expected = [[{ distanceKm: 1700, durationMinutes: 1200 }]];
        vi.mocked(primary.getDistanceMatrix).mockRejectedValue(new Error("timeout"));
        vi.mocked(fallback.getDistanceMatrix).mockResolvedValue(expected);

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const wrapped = withFallback.routing(primary, fallback);
        const result = await wrapped.getDistanceMatrix(sources, destinations);

        expect(result).toBe(expected);
        expect(fallback.getDistanceMatrix).toHaveBeenCalledWith(sources, destinations);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("primary distance matrix failed"),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe("getRoute", () => {
      it("returns primary result on success", async () => {
        const primary = mockRoutingProvider("primary");
        const fallback = mockRoutingProvider("fallback");
        const origin = { lat: 10, lon: 106 };
        const destination = { lat: 21, lon: 105 };
        const expected = { distanceKm: 1700, durationMinutes: 1200, geometry: [[10, 106], [21, 105]] as [number, number][] };
        vi.mocked(primary.getRoute).mockResolvedValue(expected);

        const wrapped = withFallback.routing(primary, fallback);
        const result = await wrapped.getRoute(origin, destination);

        expect(result).toBe(expected);
        expect(primary.getRoute).toHaveBeenCalledWith(origin, destination);
        expect(fallback.getRoute).not.toHaveBeenCalled();
      });

      it("falls back on primary failure", async () => {
        const primary = mockRoutingProvider("primary");
        const fallback = mockRoutingProvider("fallback");
        const origin = { lat: 10, lon: 106 };
        const destination = { lat: 21, lon: 105 };
        const expected = { distanceKm: 1700, durationMinutes: 1200, geometry: [[10, 106], [21, 105]] as [number, number][] };
        vi.mocked(primary.getRoute).mockRejectedValue(new Error("500"));
        vi.mocked(fallback.getRoute).mockResolvedValue(expected);

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const wrapped = withFallback.routing(primary, fallback);
        const result = await wrapped.getRoute(origin, destination);

        expect(result).toBe(expected);
        expect(fallback.getRoute).toHaveBeenCalledWith(origin, destination);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("primary route failed"),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });
  });
});
