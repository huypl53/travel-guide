import { describe, it, expect } from "vitest";

// We test the parsing/formatting logic extracted into a helper
import { buildOsrmTableUrl, parseTableResponse, decodePolyline, buildOsrmRouteUrl } from "@/lib/osrm";

describe("buildOsrmTableUrl", () => {
  it("builds correct OSRM table URL with sources and destinations", () => {
    const sources = [{ lat: 11.94, lon: 108.45 }, { lat: 12.0, lon: 108.5 }];
    const destinations = [{ lat: 11.95, lon: 108.46 }];
    const url = buildOsrmTableUrl(sources, destinations);

    // OSRM expects lon,lat order; sources first, then destinations
    expect(url).toContain("108.45,11.94;108.5,12;108.46,11.95");
    expect(url).toContain("sources=0;1");
    expect(url).toContain("destinations=2");
    expect(url).toContain("annotations=distance,duration");
  });
});

describe("parseTableResponse", () => {
  it("parses OSRM table response into distance matrix", () => {
    const response = {
      distances: [[1500, 3000], [2000, 4000]], // meters
      durations: [[120, 240], [180, 360]],       // seconds
    };
    const result = parseTableResponse(response, 2, 2);

    expect(result).toHaveLength(2); // 2 sources
    expect(result[0]).toHaveLength(2); // 2 destinations each
    expect(result[0][0]).toEqual({ distanceKm: 1.5, durationMinutes: 2 });
    expect(result[1][1]).toEqual({ distanceKm: 4, durationMinutes: 6 });
  });

  it("returns null for null entries (no route)", () => {
    const response = {
      distances: [[null]],
      durations: [[null]],
    };
    const result = parseTableResponse(response, 1, 1);
    expect(result[0][0]).toBeNull();
  });
});

describe("decodePolyline", () => {
  it("decodes encoded polyline string to lat/lon pairs", () => {
    // "_p~iF~ps|U" encodes (38.5, -120.2)
    // "_ulLnnqC" encodes delta to (40.7, -120.95)
    // "_mqNvxq`@" encodes delta to (43.252, -126.453)
    const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
    const points = decodePolyline(encoded);

    expect(points).toHaveLength(3);
    expect(points[0][0]).toBeCloseTo(38.5, 1);
    expect(points[0][1]).toBeCloseTo(-120.2, 1);
    expect(points[1][0]).toBeCloseTo(40.7, 1);
    expect(points[1][1]).toBeCloseTo(-120.95, 1);
  });

  it("returns empty array for empty string", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("buildOsrmRouteUrl", () => {
  it("builds correct OSRM route URL", () => {
    const url = buildOsrmRouteUrl({ lat: 11.94, lon: 108.45 }, { lat: 11.95, lon: 108.46 });
    expect(url).toContain("108.45,11.94;108.46,11.95");
    expect(url).toContain("overview=full");
    expect(url).toContain("geometries=polyline");
  });
});
