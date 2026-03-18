import type { GeocodingProvider, GeocodingResult } from "../types";

export class NominatimGeocodingProvider implements GeocodingProvider {
  name = "nominatim";

  async search(
    query: string,
    options?: { country?: string }
  ): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "5",
    });

    if (options?.country) {
      params.set("countrycodes", options.country);
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Proximap/1.0" },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return data.map(
        (item: { display_name: string; lat: string; lon: string }) => ({
          name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        })
      );
    } catch {
      return [];
    }
  }
}
