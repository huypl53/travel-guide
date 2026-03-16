import { describe, it, expect } from "vitest";
import { parseGoogleMapsUrl, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";

describe("parseGoogleMapsUrl", () => {
  it("parses @lat,lon from full URL", () => {
    const url = "https://www.google.com/maps/place/Da+Lat/@11.9404,108.4583,15z";
    const result = parseGoogleMapsUrl(url);
    expect(result).toEqual({ lat: 11.9404, lon: 108.4583, name: "Da Lat" });
  });

  it("parses URL with /place/ name", () => {
    const url = "https://www.google.com/maps/place/Crazy+House/@11.9326,108.4312,17z";
    const result = parseGoogleMapsUrl(url);
    expect(result?.name).toBe("Crazy House");
    expect(result?.lat).toBeCloseTo(11.9326, 3);
  });

  it("parses short maps URL with query params", () => {
    const url = "https://maps.google.com/?q=11.9404,108.4583";
    const result = parseGoogleMapsUrl(url);
    expect(result?.lat).toBeCloseTo(11.9404, 3);
    expect(result?.lon).toBeCloseTo(108.4583, 3);
  });

  it("returns null for invalid URL", () => {
    expect(parseGoogleMapsUrl("not a url")).toBeNull();
    expect(parseGoogleMapsUrl("https://example.com")).toBeNull();
  });
});

describe("parseCsvLocations", () => {
  it("parses standard CSV with name,lat,lon columns", () => {
    const csv = `name,lat,lon
Villa Rose,11.94,108.45
Cozy Cabin,11.93,108.44`;
    const result = parseCsvLocations(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Villa Rose", lat: 11.94, lon: 108.45, address: null });
  });

  it("parses CSV with address column", () => {
    const csv = `name,address,lat,lon
Villa Rose,123 Main St,11.94,108.45`;
    const result = parseCsvLocations(csv);
    expect(result[0].address).toBe("123 Main St");
  });

  it("skips rows with invalid coordinates", () => {
    const csv = `name,lat,lon
Valid,11.94,108.45
Invalid,abc,def`;
    const result = parseCsvLocations(csv);
    expect(result).toHaveLength(1);
  });
});

describe("parseJsonLocations", () => {
  it("parses JSON array of locations", () => {
    const json = JSON.stringify([
      { name: "Villa Rose", lat: 11.94, lon: 108.45 },
    ]);
    const result = parseJsonLocations(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Villa Rose");
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseJsonLocations("not json")).toEqual([]);
  });
});
