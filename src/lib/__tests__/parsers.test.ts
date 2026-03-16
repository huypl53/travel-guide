import { describe, it, expect } from "vitest";
import { parseGoogleMapsUrl } from "@/lib/parsers";

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
