import { describe, it, expect, afterEach, vi } from "vitest";
import { GoogleGeocodingProvider } from "../google/geocoding";

describe("GoogleGeocodingProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses successful geocoding results and builds correct URL", async () => {
    const mockResponse = {
      status: "OK",
      results: [
        {
          formatted_address: "123 Main St, Springfield, IL, USA",
          geometry: { location: { lat: 39.7817, lng: -89.6501 } },
        },
        {
          formatted_address: "456 Main St, Springfield, MO, USA",
          geometry: { location: { lat: 37.2089, lng: -93.2922 } },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const provider = new GoogleGeocodingProvider("test-api-key");
    const results = await provider.search("Springfield", { country: "US" });

    expect(results).toEqual([
      { name: "123 Main St, Springfield, IL, USA", lat: 39.7817, lon: -89.6501 },
      { name: "456 Main St, Springfield, MO, USA", lat: 37.2089, lon: -93.2922 },
    ]);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("key=test-api-key");
    expect(calledUrl).toContain("components=country%3AUS");
    expect(calledUrl).toContain("address=Springfield");
  });

  it("returns empty array on ZERO_RESULTS", async () => {
    const mockResponse = { status: "ZERO_RESULTS", results: [] };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const provider = new GoogleGeocodingProvider("test-api-key");
    const results = await provider.search("nonexistent place xyz");

    expect(results).toEqual([]);
  });

  it("returns empty array on REQUEST_DENIED status", async () => {
    const mockResponse = {
      status: "REQUEST_DENIED",
      results: [],
      error_message: "The provided API key is invalid.",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const provider = new GoogleGeocodingProvider("bad-key");
    const results = await provider.search("test");
    expect(results).toEqual([]);
  });

  it("returns empty array on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network error")
    );

    const provider = new GoogleGeocodingProvider("test-api-key");
    const results = await provider.search("test");
    expect(results).toEqual([]);
  });
});
