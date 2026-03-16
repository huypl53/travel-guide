import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OsrmRoutingProvider } from "../osm/routing";

describe("OsrmRoutingProvider", () => {
  let provider: OsrmRoutingProvider;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new OsrmRoutingProvider();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("getDistanceMatrix", () => {
    it("returns parsed matrix from OSRM table response", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            distances: [[0, 5000], [3000, 0]],
            durations: [[0, 600], [360, 0]],
          }),
          { status: 200 }
        )
      );

      const sources = [{ lat: 10.0, lon: 106.0 }];
      const destinations = [{ lat: 10.1, lon: 106.1 }, { lat: 10.2, lon: 106.2 }];
      const result = await provider.getDistanceMatrix(sources, destinations);

      expect(result).toEqual([
        [
          { distanceKm: 0, durationMinutes: 0 },
          { distanceKm: 5, durationMinutes: 10 },
        ],
      ]);
    });

    it("returns null entries for null OSRM values", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            distances: [[null, 2000]],
            durations: [[null, 120]],
          }),
          { status: 200 }
        )
      );

      const sources = [{ lat: 10.0, lon: 106.0 }];
      const destinations = [{ lat: 10.1, lon: 106.1 }, { lat: 10.2, lon: 106.2 }];
      const result = await provider.getDistanceMatrix(sources, destinations);

      expect(result).toEqual([
        [null, { distanceKm: 2, durationMinutes: 2 }],
      ]);
    });

    it("throws on OSRM error code", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "InvalidQuery", message: "bad request" }),
          { status: 200 }
        )
      );

      const sources = [{ lat: 10.0, lon: 106.0 }];
      const destinations = [{ lat: 10.1, lon: 106.1 }];

      await expect(
        provider.getDistanceMatrix(sources, destinations)
      ).rejects.toThrow();
    });

    it("throws on fetch failure", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("Server Error", { status: 500 })
      );

      const sources = [{ lat: 10.0, lon: 106.0 }];
      const destinations = [{ lat: 10.1, lon: 106.1 }];

      await expect(
        provider.getDistanceMatrix(sources, destinations)
      ).rejects.toThrow();
    });
  });

  describe("getRoute", () => {
    it("returns decoded polyline geometry", async () => {
      // "_p~iF~ps|U" decodes to [[38.5, -120.2]]
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [
              {
                distance: 15000,
                duration: 900,
                geometry: "_p~iF~ps|U",
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getRoute(
        { lat: 10.0, lon: 106.0 },
        { lat: 10.1, lon: 106.1 }
      );

      expect(result).not.toBeNull();
      expect(result!.distanceKm).toBe(15);
      expect(result!.durationMinutes).toBe(15);
      expect(result!.geometry).toEqual([[38.5, -120.2]]);
    });

    it("returns null when no route found", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "NoRoute",
            routes: [],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getRoute(
        { lat: 10.0, lon: 106.0 },
        { lat: 10.1, lon: 106.1 }
      );

      expect(result).toBeNull();
    });
  });
});
