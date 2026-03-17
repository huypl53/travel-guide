import type { GeocodingProvider, GeocodingResult } from "../types";

export class GoogleGeocodingProvider implements GeocodingProvider {
  name = "google";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.GOOGLE_MAPS_API_KEY ?? "";
  }

  async search(
    query: string,
    options?: { country?: string }
  ): Promise<GeocodingResult[]> {
    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/geocode/json"
      );
      url.searchParams.set("address", query);
      url.searchParams.set("key", this.apiKey);

      if (options?.country) {
        url.searchParams.set("components", `country:${options.country}`);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        return [];
      }
      const data = await response.json();

      if (data.status === "ZERO_RESULTS") {
        return [];
      }

      if (data.status !== "OK") {
        return [];
      }

      return data.results.map(
        (result: {
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
        }) => ({
          name: result.formatted_address,
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng,
        })
      );
    } catch {
      return [];
    }
  }
}
