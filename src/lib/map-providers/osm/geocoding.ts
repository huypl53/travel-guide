import type { GeocodingProvider, GeocodingResult } from "../types";

export class NominatimGeocodingProvider implements GeocodingProvider {
  name = "nominatim";

  async search(
    _query: string,
    _options?: { country?: string }
  ): Promise<GeocodingResult[]> {
    throw new Error("Not implemented yet");
  }
}
