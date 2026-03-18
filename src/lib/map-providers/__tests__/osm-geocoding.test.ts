import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NominatimGeocodingProvider } from "../osm/geocoding";

describe("NominatimGeocodingProvider", () => {
  let provider: NominatimGeocodingProvider;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new NominatimGeocodingProvider();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns parsed results on successful search", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { display_name: "Hanoi, Vietnam", lat: "21.0285", lon: "105.8542" },
          { display_name: "Ha Noi Old Quarter", lat: "21.0340", lon: "105.8500" },
        ]),
        { status: 200 }
      )
    );

    const results = await provider.search("Hanoi");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://nominatim.openstreetmap.org/search");
    expect(calledUrl).toContain("q=Hanoi");
    expect(calledUrl).toContain("format=json");
    expect(calledUrl).toContain("limit=5");

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.headers).toEqual({ "User-Agent": "Proximap/1.0" });

    expect(results).toEqual([
      { name: "Hanoi, Vietnam", lat: 21.0285, lon: 105.8542 },
      { name: "Ha Noi Old Quarter", lat: 21.034, lon: 105.85 },
    ]);
  });

  it("returns empty array on fetch failure", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const results = await provider.search("Hanoi");

    expect(results).toEqual([]);
  });

  it("returns empty array on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Service Unavailable", { status: 503 })
    );

    const results = await provider.search("Hanoi");

    expect(results).toEqual([]);
  });

  it("applies country code filter when provided", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    await provider.search("Hanoi", { country: "vn" });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("countrycodes=vn");
  });

  it("does not include countrycodes param when country not provided", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    await provider.search("Hanoi");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("countrycodes");
  });
});
