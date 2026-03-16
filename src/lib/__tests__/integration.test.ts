import { describe, it, expect, beforeEach } from "vitest";
import { useTripStore } from "@/store/trip-store";
import { rankHomestays } from "@/lib/ranking";
import { parseGoogleMapsUrl, parseCsvLocations } from "@/lib/parsers";

describe("full flow integration", () => {
  beforeEach(() => useTripStore.getState().reset());

  it("parses locations, adds to store, ranks correctly", () => {
    // Parse a Google Maps link
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Villa+Rose/@11.94,108.45,15z"
    );
    expect(parsed).not.toBeNull();

    // Add homestays
    useTripStore.getState().addLocation({
      type: "homestay",
      name: parsed!.name!,
      lat: parsed!.lat,
      lon: parsed!.lon,
      address: null,
      source: "google_maps",
    });

    // Parse CSV destinations
    const csvDests = parseCsvLocations(`name,lat,lon
Crazy House,11.9326,108.4312
Xuan Huong Lake,11.9465,108.4485`);

    csvDests.forEach((d) => {
      useTripStore.getState().addLocation({
        type: "destination",
        name: d.name,
        lat: d.lat,
        lon: d.lon,
        address: d.address,
        source: "csv",
      });
    });

    const locs = useTripStore.getState().locations;
    const homestays = locs.filter((l) => l.type === "homestay");
    const destinations = locs.filter((l) => l.type === "destination");

    expect(homestays).toHaveLength(1);
    expect(destinations).toHaveLength(2);

    // Rank
    const ranked = rankHomestays(homestays, destinations);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].weightedAvgKm).toBeGreaterThan(0);
    expect(ranked[0].distances).toHaveLength(2);
  });
});
