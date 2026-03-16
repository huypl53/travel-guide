import type { GeocodingProvider, GeocodingResult } from "../types";

export class GoogleGeocodingProvider implements GeocodingProvider {
  name = "google";

  async search(
    _query: string,
    _options?: { country?: string }
  ): Promise<GeocodingResult[]> {
    throw new Error("Not implemented yet");
  }
}
