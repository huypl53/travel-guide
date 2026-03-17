# Google Maps Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google Maps as an alternative map provider with provider abstraction, env-var toggle, and auto-fallback to OSM.

**Architecture:** Interface-first abstraction with `GeocodingProvider` and `RoutingProvider` interfaces. OSM and Google implementations behind a factory that reads `MAP_PROVIDER` env var. Map rendering uses two components (`leaflet-map.tsx`, `google-map.tsx`) conditionally loaded by `map-view.tsx`. All API routes use the provider factory with try/catch fallback.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, `@vis.gl/react-google-maps`, Google Geocoding/Distance Matrix/Directions REST APIs.

---

### Task 1: Provider Types & Factory Skeleton

**Files:**
- Create: `src/lib/map-providers/types.ts`
- Create: `src/lib/map-providers/index.ts`
- Test: `src/lib/map-providers/__tests__/factory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/factory.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getGeocodingProvider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns OSM provider by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "");
    // Re-import to pick up env change
    const { getGeocodingProvider } = await import("../index");
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("nominatim");
  });

  it("returns Google provider when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    const { getGeocodingProvider } = await import("../index");
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("google");
  });

  it("falls back to OSM when google configured but no API key", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const { getGeocodingProvider } = await import("../index");
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("nominatim");
  });
});

describe("getRoutingProvider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns OSRM provider by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "");
    const { getRoutingProvider } = await import("../index");
    const provider = getRoutingProvider();
    expect(provider.name).toBe("osrm");
  });

  it("returns Google provider when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    const { getRoutingProvider } = await import("../index");
    const provider = getRoutingProvider();
    expect(provider.name).toBe("google");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/factory.test.ts`
Expected: FAIL — modules don't exist yet

**Step 3: Write types and factory**

```typescript
// src/lib/map-providers/types.ts
export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
}

export interface DistanceMatrixEntry {
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lat, lon][]
}

export interface GeocodingProvider {
  name: string;
  search(query: string, options?: { country?: string }): Promise<GeocodingResult[]>;
}

export interface RoutingProvider {
  name: string;
  getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]>;
  getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult | null>;
}
```

```typescript
// src/lib/map-providers/index.ts
import type { GeocodingProvider, RoutingProvider } from "./types";

export type { GeocodingProvider, RoutingProvider, GeocodingResult, DistanceMatrixEntry, RouteResult, LatLon } from "./types";

function isGoogleConfigured(): boolean {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return provider === "google" && !!apiKey;
}

export function getGeocodingProvider(): GeocodingProvider {
  if (isGoogleConfigured()) {
    // Lazy import to avoid loading Google modules when not needed
    const { GoogleGeocodingProvider } = require("./google/geocoding");
    return new GoogleGeocodingProvider(process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);
  }
  const { NominatimGeocodingProvider } = require("./osm/geocoding");
  return new NominatimGeocodingProvider();
}

export function getRoutingProvider(): RoutingProvider {
  if (isGoogleConfigured()) {
    const { GoogleRoutingProvider } = require("./google/routing");
    return new GoogleRoutingProvider(process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);
  }
  const { OsrmRoutingProvider } = require("./osm/routing");
  return new OsrmRoutingProvider();
}

export function getMapProvider(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (provider === "google" && apiKey) return "google";
  if (provider === "google" && !apiKey) {
    console.warn("[map-providers] MAP_PROVIDER=google but NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Falling back to OSM.");
  }
  return "osm";
}
```

**Step 4: Create stub provider files so factory can import them**

Create empty placeholder classes (will be fully implemented in Tasks 2-5):

```typescript
// src/lib/map-providers/osm/geocoding.ts
import type { GeocodingProvider, GeocodingResult } from "../types";

export class NominatimGeocodingProvider implements GeocodingProvider {
  name = "nominatim";
  async search(_query: string, _options?: { country?: string }): Promise<GeocodingResult[]> {
    throw new Error("Not implemented yet");
  }
}
```

```typescript
// src/lib/map-providers/osm/routing.ts
import type { RoutingProvider, LatLon, DistanceMatrixEntry, RouteResult } from "../types";

export class OsrmRoutingProvider implements RoutingProvider {
  name = "osrm";
  async getDistanceMatrix(_sources: LatLon[], _destinations: LatLon[]): Promise<(DistanceMatrixEntry | null)[][]> {
    throw new Error("Not implemented yet");
  }
  async getRoute(_origin: LatLon, _destination: LatLon): Promise<RouteResult | null> {
    throw new Error("Not implemented yet");
  }
}
```

```typescript
// src/lib/map-providers/google/geocoding.ts
import type { GeocodingProvider, GeocodingResult } from "../types";

export class GoogleGeocodingProvider implements GeocodingProvider {
  name = "google";
  constructor(private apiKey: string) {}
  async search(_query: string, _options?: { country?: string }): Promise<GeocodingResult[]> {
    throw new Error("Not implemented yet");
  }
}
```

```typescript
// src/lib/map-providers/google/routing.ts
import type { RoutingProvider, LatLon, DistanceMatrixEntry, RouteResult } from "../types";

export class GoogleRoutingProvider implements RoutingProvider {
  name = "google";
  constructor(private apiKey: string) {}
  async getDistanceMatrix(_sources: LatLon[], _destinations: LatLon[]): Promise<(DistanceMatrixEntry | null)[][]> {
    throw new Error("Not implemented yet");
  }
  async getRoute(_origin: LatLon, _destination: LatLon): Promise<RouteResult | null> {
    throw new Error("Not implemented yet");
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/factory.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/map-providers/
git commit -m "feat: add provider abstraction types and factory with env-var toggle"
```

---

### Task 2: OSM Geocoding Provider (Extract from API Route)

**Files:**
- Modify: `src/lib/map-providers/osm/geocoding.ts`
- Test: `src/lib/map-providers/__tests__/osm-geocoding.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/osm-geocoding.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NominatimGeocodingProvider } from "../osm/geocoding";

describe("NominatimGeocodingProvider", () => {
  const provider = new NominatimGeocodingProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed geocoding results", async () => {
    const mockResponse = [
      { display_name: "Da Lat, Lam Dong, Vietnam", lat: "11.9404", lon: "108.4583" },
      { display_name: "Da Lat Palace", lat: "11.9412", lon: "108.4390" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await provider.search("Da Lat", { country: "vn" });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ name: "Da Lat, Lam Dong, Vietnam", lat: 11.9404, lon: 108.4583 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": "HomestayLocator/1.0" }) })
    );
  });

  it("returns empty array on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 502,
    } as Response);

    const results = await provider.search("invalid");
    expect(results).toEqual([]);
  });

  it("includes country code filter when provided", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await provider.search("test", { country: "vn" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("countrycodes=vn"),
      expect.anything()
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/osm-geocoding.test.ts`
Expected: FAIL — search throws "Not implemented yet"

**Step 3: Implement NominatimGeocodingProvider**

```typescript
// src/lib/map-providers/osm/geocoding.ts
import type { GeocodingProvider, GeocodingResult } from "../types";

export class NominatimGeocodingProvider implements GeocodingProvider {
  name = "nominatim";

  async search(query: string, options?: { country?: string }): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "5",
    });
    if (options?.country) {
      params.set("countrycodes", options.country);
    }

    const url = `https://nominatim.openstreetmap.org/search?${params}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "HomestayLocator/1.0" },
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data.map((item: { display_name: string; lat: string; lon: string }) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    } catch {
      return [];
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/osm-geocoding.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/map-providers/osm/geocoding.ts src/lib/map-providers/__tests__/osm-geocoding.test.ts
git commit -m "feat: implement Nominatim geocoding provider"
```

---

### Task 3: OSM Routing Provider (Extract from lib/osrm.ts + API Routes)

**Files:**
- Modify: `src/lib/map-providers/osm/routing.ts`
- Test: `src/lib/map-providers/__tests__/osm-routing.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/osm-routing.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OsrmRoutingProvider } from "../osm/routing";

describe("OsrmRoutingProvider", () => {
  const provider = new OsrmRoutingProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDistanceMatrix", () => {
    it("returns parsed distance matrix from OSRM table API", async () => {
      const mockResponse = {
        code: "Ok",
        distances: [[1500, 3000]],
        durations: [[120, 240]],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const sources = [{ lat: 11.94, lon: 108.45 }];
      const destinations = [{ lat: 11.95, lon: 108.46 }, { lat: 12.0, lon: 108.5 }];
      const matrix = await provider.getDistanceMatrix(sources, destinations);

      expect(matrix).toHaveLength(1);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[0][0]).toEqual({ distanceKm: 1.5, durationMinutes: 2 });
      expect(matrix[0][1]).toEqual({ distanceKm: 3, durationMinutes: 4 });
    });

    it("returns null entries when OSRM returns null", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", distances: [[null]], durations: [[null]] }),
      } as Response);

      const matrix = await provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }]);
      expect(matrix[0][0]).toBeNull();
    });

    it("throws on OSRM error code", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "InvalidQuery" }),
      } as Response);

      await expect(provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }])).rejects.toThrow();
    });
  });

  describe("getRoute", () => {
    it("returns decoded route geometry", async () => {
      // "_p~iF~ps|U" encodes (38.5, -120.2) as first point
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [{
            distance: 5000,
            duration: 300,
            geometry: "_p~iF~ps|U_ulLnnqC",
          }],
        }),
      } as Response);

      const result = await provider.getRoute({ lat: 38.5, lon: -120.2 }, { lat: 40.7, lon: -120.95 });
      expect(result).not.toBeNull();
      expect(result!.distanceKm).toBe(5);
      expect(result!.durationMinutes).toBe(5);
      expect(result!.geometry.length).toBeGreaterThan(0);
      expect(result!.geometry[0][0]).toBeCloseTo(38.5, 1);
    });

    it("returns null when no route found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", routes: [] }),
      } as Response);

      const result = await provider.getRoute({ lat: 0, lon: 0 }, { lat: 1, lon: 1 });
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/osm-routing.test.ts`
Expected: FAIL

**Step 3: Implement OsrmRoutingProvider**

This reuses logic from `src/lib/osrm.ts` (which stays for backward compat with existing tests):

```typescript
// src/lib/map-providers/osm/routing.ts
import type { RoutingProvider, LatLon, DistanceMatrixEntry, RouteResult } from "../types";
import { buildOsrmTableUrl, parseTableResponse, buildOsrmRouteUrl, decodePolyline } from "@/lib/osrm";

export class OsrmRoutingProvider implements RoutingProvider {
  name = "osrm";

  async getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]> {
    const url = buildOsrmTableUrl(sources, destinations);
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM table request failed");

    const data = await res.json();
    if (data.code !== "Ok") throw new Error("OSRM error: " + data.code);

    return parseTableResponse(data, sources.length, destinations.length);
  }

  async getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult | null> {
    const url = buildOsrmRouteUrl(origin, destination);
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM route request failed");

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry) return null;

    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: decodePolyline(route.geometry),
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/osm-routing.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/map-providers/osm/routing.ts src/lib/map-providers/__tests__/osm-routing.test.ts
git commit -m "feat: implement OSRM routing provider"
```

---

### Task 4: Google Geocoding Provider

**Files:**
- Modify: `src/lib/map-providers/google/geocoding.ts`
- Test: `src/lib/map-providers/__tests__/google-geocoding.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/google-geocoding.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleGeocodingProvider } from "../google/geocoding";

describe("GoogleGeocodingProvider", () => {
  const provider = new GoogleGeocodingProvider("test-api-key");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed results from Google Geocoding API", async () => {
    const mockResponse = {
      status: "OK",
      results: [
        {
          formatted_address: "Da Lat, Lam Dong, Vietnam",
          geometry: { location: { lat: 11.9404, lng: 108.4583 } },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await provider.search("Da Lat", { country: "vn" });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ name: "Da Lat, Lam Dong, Vietnam", lat: 11.9404, lon: 108.4583 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("maps.googleapis.com/maps/api/geocode/json"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("key=test-api-key"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("components=country%3Avn"));
  });

  it("returns empty array on ZERO_RESULTS", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    } as Response);

    const results = await provider.search("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("throws on API error status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "REQUEST_DENIED", error_message: "Invalid key" }),
    } as Response);

    await expect(provider.search("test")).rejects.toThrow("REQUEST_DENIED");
  });

  it("throws on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    await expect(provider.search("test")).rejects.toThrow("Network error");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/google-geocoding.test.ts`
Expected: FAIL

**Step 3: Implement GoogleGeocodingProvider**

```typescript
// src/lib/map-providers/google/geocoding.ts
import type { GeocodingProvider, GeocodingResult } from "../types";

export class GoogleGeocodingProvider implements GeocodingProvider {
  name = "google";

  constructor(private apiKey: string) {}

  async search(query: string, options?: { country?: string }): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      address: query,
      key: this.apiKey,
    });

    if (options?.country) {
      params.set("components", `country:${options.country}`);
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Geocoding HTTP error: ${res.status}`);

    const data = await res.json();

    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK") {
      throw new Error(`Google Geocoding error: ${data.status} - ${data.error_message || ""}`);
    }

    return data.results.map((item: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }) => ({
      name: item.formatted_address,
      lat: item.geometry.location.lat,
      lon: item.geometry.location.lng,
    }));
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/google-geocoding.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/map-providers/google/geocoding.ts src/lib/map-providers/__tests__/google-geocoding.test.ts
git commit -m "feat: implement Google Geocoding provider"
```

---

### Task 5: Google Routing Provider

**Files:**
- Modify: `src/lib/map-providers/google/routing.ts`
- Test: `src/lib/map-providers/__tests__/google-routing.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/google-routing.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleRoutingProvider } from "../google/routing";

describe("GoogleRoutingProvider", () => {
  const provider = new GoogleRoutingProvider("test-api-key");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDistanceMatrix", () => {
    it("returns parsed distance matrix", async () => {
      const mockResponse = {
        status: "OK",
        rows: [
          {
            elements: [
              { status: "OK", distance: { value: 1500 }, duration: { value: 120 } },
              { status: "OK", distance: { value: 3000 }, duration: { value: 240 } },
            ],
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const matrix = await provider.getDistanceMatrix(
        [{ lat: 11.94, lon: 108.45 }],
        [{ lat: 11.95, lon: 108.46 }, { lat: 12.0, lon: 108.5 }]
      );

      expect(matrix).toHaveLength(1);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[0][0]).toEqual({ distanceKm: 1.5, durationMinutes: 2 });
      expect(matrix[0][1]).toEqual({ distanceKm: 3, durationMinutes: 4 });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("maps.googleapis.com/maps/api/distancematrix/json"));
    });

    it("returns null for NOT_FOUND elements", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "OK",
          rows: [{ elements: [{ status: "NOT_FOUND" }] }],
        }),
      } as Response);

      const matrix = await provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }]);
      expect(matrix[0][0]).toBeNull();
    });

    it("throws on API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "REQUEST_DENIED", error_message: "Invalid key" }),
      } as Response);

      await expect(
        provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }])
      ).rejects.toThrow("REQUEST_DENIED");
    });
  });

  describe("getRoute", () => {
    it("returns route with decoded polyline", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "OK",
          routes: [{
            legs: [{ distance: { value: 5000 }, duration: { value: 300 } }],
            overview_polyline: { points: "_p~iF~ps|U_ulLnnqC" },
          }],
        }),
      } as Response);

      const result = await provider.getRoute({ lat: 38.5, lon: -120.2 }, { lat: 40.7, lon: -120.95 });
      expect(result).not.toBeNull();
      expect(result!.distanceKm).toBe(5);
      expect(result!.durationMinutes).toBe(5);
      expect(result!.geometry.length).toBeGreaterThan(0);
    });

    it("returns null when no routes found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ZERO_RESULTS", routes: [] }),
      } as Response);

      const result = await provider.getRoute({ lat: 0, lon: 0 }, { lat: 1, lon: 1 });
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/google-routing.test.ts`
Expected: FAIL

**Step 3: Implement GoogleRoutingProvider**

```typescript
// src/lib/map-providers/google/routing.ts
import type { RoutingProvider, LatLon, DistanceMatrixEntry, RouteResult } from "../types";
import { decodePolyline } from "@/lib/osrm";

export class GoogleRoutingProvider implements RoutingProvider {
  name = "google";

  constructor(private apiKey: string) {}

  async getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]> {
    const origins = sources.map((s) => `${s.lat},${s.lon}`).join("|");
    const dests = destinations.map((d) => `${d.lat},${d.lon}`).join("|");

    const params = new URLSearchParams({
      origins,
      destinations: dests,
      key: this.apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Distance Matrix HTTP error: ${res.status}`);

    const data = await res.json();
    if (data.status !== "OK") {
      throw new Error(`Google Distance Matrix error: ${data.status} - ${data.error_message || ""}`);
    }

    return data.rows.map((row: { elements: Array<{ status: string; distance?: { value: number }; duration?: { value: number } }> }) =>
      row.elements.map((el) => {
        if (el.status !== "OK") return null;
        return {
          distanceKm: el.distance!.value / 1000,
          durationMinutes: el.duration!.value / 60,
        };
      })
    );
  }

  async getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult | null> {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lon}`,
      destination: `${destination.lat},${destination.lon}`,
      key: this.apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Directions HTTP error: ${res.status}`);

    const data = await res.json();
    if (data.status === "ZERO_RESULTS" || !data.routes?.length) return null;
    if (data.status !== "OK") {
      throw new Error(`Google Directions error: ${data.status} - ${data.error_message || ""}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      distanceKm: leg.distance.value / 1000,
      durationMinutes: leg.duration.value / 60,
      geometry: decodePolyline(route.overview_polyline.points),
    };
  }
}
```

Note: Google uses the same encoded polyline format (precision 5) as OSRM, so we reuse `decodePolyline` from `src/lib/osrm.ts`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/google-routing.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/map-providers/google/routing.ts src/lib/map-providers/__tests__/google-routing.test.ts
git commit -m "feat: implement Google routing provider (Distance Matrix + Directions)"
```

---

### Task 6: Fallback Wrapper with Auto-Retry

**Files:**
- Create: `src/lib/map-providers/fallback.ts`
- Test: `src/lib/map-providers/__tests__/fallback.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/map-providers/__tests__/fallback.test.ts
import { describe, it, expect, vi } from "vitest";
import { withFallback } from "../fallback";
import type { GeocodingProvider, RoutingProvider } from "../types";

describe("withFallback geocoding", () => {
  it("returns primary result on success", async () => {
    const primary: GeocodingProvider = {
      name: "google",
      search: vi.fn().mockResolvedValue([{ name: "Da Lat", lat: 11.94, lon: 108.45 }]),
    };
    const fallback: GeocodingProvider = {
      name: "nominatim",
      search: vi.fn(),
    };

    const provider = withFallback.geocoding(primary, fallback);
    const results = await provider.search("Da Lat");

    expect(results).toHaveLength(1);
    expect(primary.search).toHaveBeenCalled();
    expect(fallback.search).not.toHaveBeenCalled();
  });

  it("falls back on primary failure", async () => {
    const primary: GeocodingProvider = {
      name: "google",
      search: vi.fn().mockRejectedValue(new Error("quota exceeded")),
    };
    const fallback: GeocodingProvider = {
      name: "nominatim",
      search: vi.fn().mockResolvedValue([{ name: "Da Lat", lat: 11.94, lon: 108.45 }]),
    };

    const provider = withFallback.geocoding(primary, fallback);
    const results = await provider.search("Da Lat");

    expect(results).toHaveLength(1);
    expect(primary.search).toHaveBeenCalled();
    expect(fallback.search).toHaveBeenCalled();
  });
});

describe("withFallback routing", () => {
  it("returns primary result on success", async () => {
    const primary: RoutingProvider = {
      name: "google",
      getDistanceMatrix: vi.fn().mockResolvedValue([[{ distanceKm: 1.5, durationMinutes: 2 }]]),
      getRoute: vi.fn().mockResolvedValue({ distanceKm: 5, durationMinutes: 5, geometry: [] }),
    };
    const fallback: RoutingProvider = {
      name: "osrm",
      getDistanceMatrix: vi.fn(),
      getRoute: vi.fn(),
    };

    const provider = withFallback.routing(primary, fallback);
    const matrix = await provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }]);

    expect(matrix[0][0]!.distanceKm).toBe(1.5);
    expect(fallback.getDistanceMatrix).not.toHaveBeenCalled();
  });

  it("falls back getDistanceMatrix on primary failure", async () => {
    const primary: RoutingProvider = {
      name: "google",
      getDistanceMatrix: vi.fn().mockRejectedValue(new Error("fail")),
      getRoute: vi.fn(),
    };
    const fallback: RoutingProvider = {
      name: "osrm",
      getDistanceMatrix: vi.fn().mockResolvedValue([[{ distanceKm: 2, durationMinutes: 3 }]]),
      getRoute: vi.fn(),
    };

    const provider = withFallback.routing(primary, fallback);
    const matrix = await provider.getDistanceMatrix([{ lat: 0, lon: 0 }], [{ lat: 1, lon: 1 }]);

    expect(matrix[0][0]!.distanceKm).toBe(2);
  });

  it("falls back getRoute on primary failure", async () => {
    const primary: RoutingProvider = {
      name: "google",
      getDistanceMatrix: vi.fn(),
      getRoute: vi.fn().mockRejectedValue(new Error("fail")),
    };
    const fallback: RoutingProvider = {
      name: "osrm",
      getDistanceMatrix: vi.fn(),
      getRoute: vi.fn().mockResolvedValue({ distanceKm: 5, durationMinutes: 5, geometry: [] }),
    };

    const provider = withFallback.routing(primary, fallback);
    const result = await provider.getRoute({ lat: 0, lon: 0 }, { lat: 1, lon: 1 });

    expect(result!.distanceKm).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/map-providers/__tests__/fallback.test.ts`
Expected: FAIL

**Step 3: Implement fallback wrapper**

```typescript
// src/lib/map-providers/fallback.ts
import type { GeocodingProvider, RoutingProvider, LatLon, GeocodingResult, DistanceMatrixEntry, RouteResult } from "./types";

export const withFallback = {
  geocoding(primary: GeocodingProvider, fallback: GeocodingProvider): GeocodingProvider {
    return {
      name: `${primary.name}+${fallback.name}`,
      async search(query: string, options?: { country?: string }): Promise<GeocodingResult[]> {
        try {
          return await primary.search(query, options);
        } catch (err) {
          console.warn(`[map-providers] ${primary.name} geocoding failed, falling back to ${fallback.name}:`, err);
          return fallback.search(query, options);
        }
      },
    };
  },

  routing(primary: RoutingProvider, fallback: RoutingProvider): RoutingProvider {
    return {
      name: `${primary.name}+${fallback.name}`,
      async getDistanceMatrix(sources: LatLon[], destinations: LatLon[]): Promise<(DistanceMatrixEntry | null)[][]> {
        try {
          return await primary.getDistanceMatrix(sources, destinations);
        } catch (err) {
          console.warn(`[map-providers] ${primary.name} distance matrix failed, falling back to ${fallback.name}:`, err);
          return fallback.getDistanceMatrix(sources, destinations);
        }
      },
      async getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult | null> {
        try {
          return await primary.getRoute(origin, destination);
        } catch (err) {
          console.warn(`[map-providers] ${primary.name} route failed, falling back to ${fallback.name}:`, err);
          return fallback.getRoute(origin, destination);
        }
      },
    };
  },
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/map-providers/__tests__/fallback.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/map-providers/fallback.ts src/lib/map-providers/__tests__/fallback.test.ts
git commit -m "feat: add fallback wrapper for provider auto-retry"
```

---

### Task 7: Update Factory to Use Fallback

**Files:**
- Modify: `src/lib/map-providers/index.ts`
- Modify: `src/lib/map-providers/__tests__/factory.test.ts`

**Step 1: Update factory to wrap Google providers with fallback**

```typescript
// src/lib/map-providers/index.ts
import type { GeocodingProvider, RoutingProvider } from "./types";
import { NominatimGeocodingProvider } from "./osm/geocoding";
import { OsrmRoutingProvider } from "./osm/routing";
import { withFallback } from "./fallback";

export type { GeocodingProvider, RoutingProvider, GeocodingResult, DistanceMatrixEntry, RouteResult, LatLon } from "./types";

function getGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function isGoogleConfigured(): boolean {
  return process.env.NEXT_PUBLIC_MAP_PROVIDER === "google" && !!getGoogleApiKey();
}

export function getGeocodingProvider(): GeocodingProvider {
  const osm = new NominatimGeocodingProvider();
  if (!isGoogleConfigured()) return osm;

  const { GoogleGeocodingProvider } = require("./google/geocoding");
  const google = new GoogleGeocodingProvider(getGoogleApiKey()!);
  return withFallback.geocoding(google, osm);
}

export function getRoutingProvider(): RoutingProvider {
  const osm = new OsrmRoutingProvider();
  if (!isGoogleConfigured()) return osm;

  const { GoogleRoutingProvider } = require("./google/routing");
  const google = new GoogleRoutingProvider(getGoogleApiKey()!);
  return withFallback.routing(google, osm);
}

export function getMapProvider(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (provider === "google" && apiKey) return "google";
  if (provider === "google" && !apiKey) {
    console.warn("[map-providers] MAP_PROVIDER=google but NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Falling back to OSM.");
  }
  return "osm";
}
```

**Step 2: Update factory test to check fallback wrapping**

Update the google-configured test to check the composite name:

```typescript
// In factory.test.ts, update the "returns Google provider when configured" test:
  it("returns Google provider with fallback when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    const { getGeocodingProvider } = await import("../index");
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("google+nominatim");
  });
```

And for routing:

```typescript
  it("returns Google provider with fallback when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_PROVIDER", "google");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    const { getRoutingProvider } = await import("../index");
    const provider = getRoutingProvider();
    expect(provider.name).toBe("google+osrm");
  });
```

**Step 3: Run all provider tests**

Run: `npx vitest run src/lib/map-providers/`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/lib/map-providers/index.ts src/lib/map-providers/__tests__/factory.test.ts
git commit -m "feat: wire fallback wrapper into provider factory"
```

---

### Task 8: Refactor API Routes to Use Providers

**Files:**
- Modify: `src/app/api/geocode/route.ts`
- Modify: `src/app/api/distances/route.ts`
- Modify: `src/app/api/routes/route.ts`

**Step 1: Refactor geocode API route**

```typescript
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGeocodingProvider } from "@/lib/map-providers";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const provider = getGeocodingProvider();
    const results = await provider.search(query, { country: "vn" });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
```

**Step 2: Refactor distances API route**

```typescript
// src/app/api/distances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoutingProvider } from "@/lib/map-providers";

const MAX_COORDINATES = 100;

function parseCoords(param: string) {
  return param.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });
}

function hasInvalidCoords(coords: { lat: number; lon: number }[]) {
  return coords.some((c) => isNaN(c.lat) || isNaN(c.lon));
}

export async function GET(request: NextRequest) {
  const sourcesParam = request.nextUrl.searchParams.get("sources");
  const destsParam = request.nextUrl.searchParams.get("destinations");

  if (!sourcesParam || !destsParam) {
    return NextResponse.json({ error: "Missing sources/destinations" }, { status: 400 });
  }

  const sources = parseCoords(sourcesParam);
  const destinations = parseCoords(destsParam);

  if (hasInvalidCoords(sources) || hasInvalidCoords(destinations)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (sources.length + destinations.length > MAX_COORDINATES) {
    return NextResponse.json({ error: `Too many coordinates (max ${MAX_COORDINATES})` }, { status: 400 });
  }

  try {
    const provider = getRoutingProvider();
    const matrix = await provider.getDistanceMatrix(sources, destinations);
    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ error: "Distance matrix request failed" }, { status: 502 });
  }
}
```

**Step 3: Refactor routes API route**

```typescript
// src/app/api/routes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoutingProvider } from "@/lib/map-providers";

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const [fromLat, fromLon] = fromParam.split(",").map(Number);
  const [toLat, toLon] = toParam.split(",").map(Number);

  if ([fromLat, fromLon, toLat, toLon].some(isNaN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const provider = getRoutingProvider();
    const result = await provider.getRoute({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon });

    if (!result) {
      return NextResponse.json({ error: "No route found" }, { status: 502 });
    }

    // Return geometry as encoded polyline format for backward compat with distance-store
    // The store calls decodePolyline on this, but our provider already decoded it.
    // Return raw geometry array instead — update distance-store in Task 9.
    return NextResponse.json({ geometry: result.geometry });
  } catch {
    return NextResponse.json({ error: "Route request failed" }, { status: 502 });
  }
}
```

**Step 4: Run existing tests to verify nothing broke**

Run: `npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/app/api/geocode/route.ts src/app/api/distances/route.ts src/app/api/routes/route.ts
git commit -m "refactor: use provider abstraction in API routes"
```

---

### Task 9: Update Distance Store for New Route Response Format

**Files:**
- Modify: `src/store/distance-store.ts`

The routes API now returns `geometry` as a `[number, number][]` array directly (already decoded), not an encoded polyline string. Update the store to handle both formats for safety.

**Step 1: Update fetchRoutes in distance-store.ts**

In `src/store/distance-store.ts`, change the `fetchRoutes` method. The route API now returns `{ geometry: [number, number][] }` instead of `{ geometry: string }`. Remove the `decodePolyline` call:

```typescript
// In fetchRoutes, replace the fetch+decode block:
// OLD:
//   const data = await res.json();
//   if (!data.geometry) return null;
//   return { key: `${homestay.id}:${dest.id}`, points: decodePolyline(data.geometry) };

// NEW:
//   const data = await res.json();
//   if (!data.geometry) return null;
//   return { key: `${homestay.id}:${dest.id}`, points: data.geometry };
```

Also remove the `decodePolyline` import since it's no longer used here.

**Step 2: Run existing distance store tests**

Run: `npx vitest run src/lib/__tests__/distance-store.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/store/distance-store.ts
git commit -m "refactor: update distance store for decoded geometry response"
```

---

### Task 10: Install Google Maps React Package & Refactor Map Components

**Files:**
- Create: `src/components/map-providers/google-map.tsx`
- Create: `src/components/map-providers/leaflet-map.tsx`
- Modify: `src/components/map-view.tsx`
- Keep: `src/components/map-inner.tsx` (can be deleted after verification)

**Step 1: Install @vis.gl/react-google-maps**

Run: `npm install @vis.gl/react-google-maps`

**Step 2: Create leaflet-map.tsx**

Move existing `map-inner.tsx` content to `src/components/map-providers/leaflet-map.tsx` with no logic changes — just the file location:

```typescript
// src/components/map-providers/leaflet-map.tsx
// Copy the ENTIRE contents of src/components/map-inner.tsx here, unchanged
```

**Step 3: Create google-map.tsx**

```typescript
// src/components/map-providers/google-map.tsx
"use client";

import { useEffect, useMemo, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";

function FlyToLocation() {
  const map = useMap();
  const focused = useTripStore((s) => s.focusedLocation);
  const clearFocus = useTripStore((s) => s.setFocusedLocation);

  useEffect(() => {
    if (focused && map) {
      map.panTo({ lat: focused.lat, lng: focused.lon });
      map.setZoom(15);
      clearFocus(null);
    }
  }, [focused, map, clearFocus]);

  return null;
}

function distanceToColor(km: number, maxKm: number): string {
  const ratio = Math.min(km / maxKm, 1);
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},0)`;
}

function RoutePolylines({
  selectedHomestay,
  destinations,
  drivingDistances,
  routes,
  maxKm,
}: {
  selectedHomestay: { id: string; lat: number; lon: number };
  destinations: { id: string; lat: number; lon: number }[];
  drivingDistances: Map<string, { drivingKm: number }>;
  routes: Map<string, [number, number][]>;
  maxKm: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const polylines: google.maps.Polyline[] = [];

    for (const d of destinations) {
      const key = `${selectedHomestay.id}:${d.id}`;
      const driving = drivingDistances.get(key);
      const routeGeometry = routes.get(key);
      const km = driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);

      const path = routeGeometry
        ? routeGeometry.map(([lat, lon]) => ({ lat, lng: lon }))
        : [
            { lat: selectedHomestay.lat, lng: selectedHomestay.lon },
            { lat: d.lat, lng: d.lon },
          ];

      const polyline = new google.maps.Polyline({
        path,
        strokeColor: distanceToColor(km, maxKm),
        strokeWeight: 3,
        strokeOpacity: 0.8,
        map,
      });
      polylines.push(polyline);
    }

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, selectedHomestay, destinations, drivingDistances, routes, maxKm]);

  return null;
}

export default function GoogleMapInner() {
  const locations = useTripStore((s) => s.locations);
  const selectedId = useTripStore((s) => s.selectedHomestayId);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const center = useMemo(() => {
    if (locations.length > 0) {
      return {
        lat: locations.reduce((s, l) => s + l.lat, 0) / locations.length,
        lng: locations.reduce((s, l) => s + l.lon, 0) / locations.length,
      };
    }
    return { lat: 11.9404, lng: 108.4583 };
  }, [locations]);

  const drivingDistances = useDistanceStore((s) => s.distances);
  const routes = useDistanceStore((s) => s.routes);
  const fetchRoutes = useDistanceStore((s) => s.fetchRoutes);

  const selectedHomestay = homestays.find((h) => h.id === selectedId);

  useEffect(() => {
    if (selectedHomestay && destinations.length > 0) {
      fetchRoutes(selectedHomestay, destinations);
    }
  }, [selectedHomestay, destinations, fetchRoutes]);

  const maxKm = useMemo(() => {
    if (!selectedHomestay || destinations.length === 0) return 10;
    return Math.max(
      ...destinations.map((d) => {
        const key = `${selectedHomestay.id}:${d.id}`;
        const driving = drivingDistances.get(key);
        return driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
      })
    );
  }, [selectedHomestay, destinations, drivingDistances]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  const handleMarkerClick = useCallback(
    (id: string) => () => setSelected(id),
    [setSelected]
  );

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        className="h-[300px] md:h-[500px] w-full rounded-lg"
        mapId="homestay-locator"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <FlyToLocation />

        {homestays.map((h) => (
          <AdvancedMarker
            key={h.id}
            position={{ lat: h.lat, lng: h.lon }}
            title={h.name}
            onClick={handleMarkerClick(h.id)}
          >
            <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#fff" />
          </AdvancedMarker>
        ))}

        {destinations.map((d) => (
          <AdvancedMarker
            key={d.id}
            position={{ lat: d.lat, lng: d.lon }}
            title={`${d.name} (priority: ${d.priority})`}
          >
            <Pin background="#ef4444" borderColor="#991b1b" glyphColor="#fff" />
          </AdvancedMarker>
        ))}

        {selectedHomestay && (
          <RoutePolylines
            selectedHomestay={selectedHomestay}
            destinations={destinations}
            drivingDistances={drivingDistances}
            routes={routes}
            maxKm={maxKm}
          />
        )}
      </Map>
    </APIProvider>
  );
}
```

**Step 4: Update map-view.tsx to conditionally load**

```typescript
// src/components/map-view.tsx
"use client";

import dynamic from "next/dynamic";
import { getMapProvider } from "@/lib/map-providers";

const LeafletMap = dynamic(
  () => import("./map-providers/leaflet-map"),
  { ssr: false, loading: () => <div className="h-[300px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

const GoogleMap = dynamic(
  () => import("./map-providers/google-map"),
  { ssr: false, loading: () => <div className="h-[300px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

export function MapView() {
  // Note: getMapProvider reads NEXT_PUBLIC_ env vars, which are inlined at build time
  // so this works client-side
  const provider = getMapProvider();
  return provider === "google" ? <GoogleMap /> : <LeafletMap />;
}
```

**Step 5: Run the app to verify both providers work**

Run: `npm run dev`
Test with default (OSM) — map should render as before.
If you have a Google API key, set env vars and restart to test Google.

**Step 6: Delete old map-inner.tsx**

Once verified, delete `src/components/map-inner.tsx` since `leaflet-map.tsx` replaces it.

**Step 7: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS (some tests may reference map-inner.tsx — update imports if needed)

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Google Maps renderer and refactor map-view to provider toggle"
```

---

### Task 11: Update Environment Example & Documentation

**Files:**
- Modify: `.env.local.example`
- Modify: `docs/architecture.md`
- Modify: `README.md`

**Step 1: Update .env.local.example**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Map provider: "osm" (default, free) or "google"
# NEXT_PUBLIC_MAP_PROVIDER=google
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
# GOOGLE_MAPS_API_KEY=your-google-maps-server-api-key
```

**Step 2: Update docs/architecture.md**

Add a "Map Provider Abstraction" section covering:
- The provider interfaces and factory
- How env-var toggle works
- Fallback behavior
- File structure of `src/lib/map-providers/`

**Step 3: Update README.md**

Add a section on configuring Google Maps (the 3 env vars, which Google APIs to enable). Keep it brief.

**Step 4: Commit**

```bash
git add .env.local.example docs/architecture.md README.md
git commit -m "docs: add Google Maps provider configuration and architecture"
```

---

### Task 12: Final Verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual smoke test — OSM mode**

Run: `npm run dev` (without Google env vars)
- Verify map renders with OSM tiles
- Verify geocoding works
- Verify distances/routes work

**Step 5: Manual smoke test — Google mode** (if API key available)

Set env vars and restart:
```
NEXT_PUBLIC_MAP_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>
GOOGLE_MAPS_API_KEY=<key>
```
- Verify Google Maps renders
- Verify geocoding returns results
- Verify distances/routes work
- Verify fallback by using an invalid key
