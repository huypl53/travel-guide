import { describe, it, expect, beforeEach, vi } from "vitest";

describe("map provider factory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("getGeocodingProvider", () => {
    it("returns nominatim by default", async () => {
      const { getGeocodingProvider } = await import("@/lib/map-providers");
      const provider = getGeocodingProvider();
      expect(provider.name).toBe("nominatim");
    });

    it("returns google when configured with API key", async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
      const { getGeocodingProvider } = await import("@/lib/map-providers");
      const provider = getGeocodingProvider();
      expect(provider.name).toBe("google+nominatim");
    });

    it("falls back to nominatim when google configured without API key", async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { getGeocodingProvider } = await import("@/lib/map-providers");
      const provider = getGeocodingProvider();
      expect(provider.name).toBe("nominatim");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("GOOGLE_MAPS_API_KEY")
      );
      warnSpy.mockRestore();
    });
  });

  describe("getRoutingProvider", () => {
    it("returns osrm by default", async () => {
      const { getRoutingProvider } = await import("@/lib/map-providers");
      const provider = getRoutingProvider();
      expect(provider.name).toBe("osrm");
    });

    it("returns google when configured with API key", async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
      const { getRoutingProvider } = await import("@/lib/map-providers");
      const provider = getRoutingProvider();
      expect(provider.name).toBe("google+osrm");
    });

    it("falls back to osrm when google configured without API key", async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { getRoutingProvider } = await import("@/lib/map-providers");
      const provider = getRoutingProvider();
      expect(provider.name).toBe("osrm");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("GOOGLE_MAPS_API_KEY")
      );
      warnSpy.mockRestore();
    });
  });

  describe("getMapProvider", () => {
    it('returns "osm" by default', async () => {
      const { getMapProvider } = await import("@/lib/map-providers");
      expect(getMapProvider()).toBe("osm");
    });

    it('returns "google" when configured with API key', async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
      const { getMapProvider } = await import("@/lib/map-providers");
      expect(getMapProvider()).toBe("google");
    });

    it('falls back to "osm" when google configured without API key', async () => {
      vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { getMapProvider } = await import("@/lib/map-providers");
      expect(getMapProvider()).toBe("osm");
      warnSpy.mockRestore();
    });
  });
});
