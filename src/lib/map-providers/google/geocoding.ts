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
    const url = new URL(
      "https://maps.googleapis.com/maps/api/geocode/json"
    );
    url.searchParams.set("address", query);
    url.searchParams.set("key", this.apiKey);

    if (options?.country) {
      url.searchParams.set("components", `country:${options.country}`);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "ZERO_RESULTS") {
      return [];
    }

    if (data.status !== "OK") {
      throw new Error(
        `Google Geocoding API error: ${data.status} - ${data.error_message ?? "Unknown error"}`
      );
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
  }
}
