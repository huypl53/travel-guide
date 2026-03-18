import { describe, it, expect } from "vitest";
import { parseGoogleMapsUrl, isShortMapsUrl, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";

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

  it("parses !3d/!4d coordinate pattern from resolved URLs", () => {
    const url = "https://www.google.com/maps/place/Tr%C3%A0ng+An+La+Casa+Homestay/@20.290245,105.8866567,17z/data=!3m1!4b1!4m9!3m8!1s0x31367922cc2c4549:0x7a36a0d0d399d9ed!5m2!4m1!1i2!8m2!3d20.290245!4d105.889237";
    const result = parseGoogleMapsUrl(url);
    expect(result?.name).toBe("Tràng An La Casa Homestay");
    expect(result?.lat).toBeCloseTo(20.290245, 3);
  });

  it("parses URL with only !3d/!4d (no @ pattern)", () => {
    const url = "https://www.google.com/maps/place/Some+Place/data=!3m1!4b1!8m2!3d11.9404!4d108.4583";
    const result = parseGoogleMapsUrl(url);
    expect(result?.lat).toBeCloseTo(11.9404, 3);
    expect(result?.lon).toBeCloseTo(108.4583, 3);
  });

  it("parses /search/ URL and extracts place name", () => {
    const url = "https://www.google.com/maps/search/GoGi+House/@21.0272019,105.7979557,35776m/data=!3m2!1e3!4b1";
    const result = parseGoogleMapsUrl(url);
    expect(result?.name).toBe("GoGi House");
    expect(result?.lat).toBeCloseTo(21.0272, 3);
    expect(result?.lon).toBeCloseTo(105.7979, 3);
  });

  it("returns null for invalid URL", () => {
    expect(parseGoogleMapsUrl("not a url")).toBeNull();
    expect(parseGoogleMapsUrl("https://example.com")).toBeNull();
  });
});

describe("isShortMapsUrl", () => {
  it("detects maps.app.goo.gl URLs", () => {
    expect(isShortMapsUrl("https://maps.app.goo.gl/Ucz8wkgRC1tcP2eA8")).toBe(true);
  });

  it("rejects full Google Maps URLs", () => {
    expect(isShortMapsUrl("https://www.google.com/maps/place/Da+Lat/@11.94,108.45")).toBe(false);
  });

  it("rejects non-maps URLs", () => {
    expect(isShortMapsUrl("https://example.com")).toBe(false);
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
