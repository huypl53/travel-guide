import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleRoutingProvider } from "../google/routing";

describe("GoogleRoutingProvider", () => {
  let provider: GoogleRoutingProvider;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new GoogleRoutingProvider("test-api-key");
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("getDistanceMatrix", () => {
    it("returns parsed distance matrix", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "OK",
            rows: [
              {
                elements: [
                  {
                    status: "OK",
                    distance: { value: 5000 },
                    duration: { value: 600 },
                  },
                  {
                    status: "OK",
                    distance: { value: 12000 },
                    duration: { value: 1200 },
                  },
                ],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getDistanceMatrix(
        [{ lat: 10.0, lon: 106.0 }],
        [
          { lat: 10.1, lon: 106.1 },
          { lat: 10.2, lon: 106.2 },
        ]
      );

      expect(fetchSpy).toHaveBeenCalledOnce();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        "https://maps.googleapis.com/maps/api/distancematrix/json"
      );
      expect(calledUrl).toContain("origins=10%2C106");
      expect(calledUrl).toContain(
        "destinations=10.1%2C106.1%7C10.2%2C106.2"
      );
      expect(calledUrl).toContain("key=test-api-key");

      expect(result).toEqual([
        [
          { distanceKm: 5, durationMinutes: 10 },
          { distanceKm: 12, durationMinutes: 20 },
        ],
      ]);
    });

    it("returns null for NOT_FOUND elements", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "OK",
            rows: [
              {
                elements: [
                  {
                    status: "OK",
                    distance: { value: 5000 },
                    duration: { value: 600 },
                  },
                  {
                    status: "NOT_FOUND",
                  },
                ],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getDistanceMatrix(
        [{ lat: 10.0, lon: 106.0 }],
        [
          { lat: 10.1, lon: 106.1 },
          { lat: 0, lon: 0 },
        ]
      );

      expect(result).toEqual([
        [{ distanceKm: 5, durationMinutes: 10 }, null],
      ]);
    });

    it("throws on REQUEST_DENIED status", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "REQUEST_DENIED",
            error_message: "API key invalid",
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.getDistanceMatrix(
          [{ lat: 10.0, lon: 106.0 }],
          [{ lat: 10.1, lon: 106.1 }]
        )
      ).rejects.toThrow();
    });

    it("throws on fetch failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        provider.getDistanceMatrix(
          [{ lat: 10.0, lon: 106.0 }],
          [{ lat: 10.1, lon: 106.1 }]
        )
      ).rejects.toThrow("Network error");
    });
  });

  describe("getRoute", () => {
    it("returns route with decoded polyline", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "OK",
            routes: [
              {
                legs: [
                  {
                    distance: { value: 15000 },
                    duration: { value: 900 },
                  },
                ],
                overview_polyline: {
                  // Encodes roughly [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
                  points: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getRoute(
        { lat: 10.0, lon: 106.0 },
        { lat: 10.5, lon: 106.5 }
      );

      expect(fetchSpy).toHaveBeenCalledOnce();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        "https://maps.googleapis.com/maps/api/directions/json"
      );
      expect(calledUrl).toContain("origin=10%2C106");
      expect(calledUrl).toContain("destination=10.5%2C106.5");
      expect(calledUrl).toContain("key=test-api-key");

      expect(result).not.toBeNull();
      expect(result!.distanceKm).toBe(15);
      expect(result!.durationMinutes).toBe(15);
      expect(result!.geometry).toBeInstanceOf(Array);
      expect(result!.geometry.length).toBeGreaterThan(0);
      // Each point should be [lat, lon]
      expect(result!.geometry[0]).toHaveLength(2);
    });

    it("returns null on ZERO_RESULTS", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ZERO_RESULTS",
            routes: [],
          }),
          { status: 200 }
        )
      );

      const result = await provider.getRoute(
        { lat: 10.0, lon: 106.0 },
        { lat: 10.5, lon: 106.5 }
      );

      expect(result).toBeNull();
    });

    it("throws on non-OK/non-ZERO_RESULTS status", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "REQUEST_DENIED",
            error_message: "Invalid key",
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.getRoute({ lat: 10.0, lon: 106.0 }, { lat: 10.5, lon: 106.5 })
      ).rejects.toThrow();
    });
  });
});
