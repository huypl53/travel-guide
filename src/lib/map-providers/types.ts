export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
}

export interface DistanceMatrixEntry {
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lat, lon][]
}

export interface GeocodingProvider {
  name: string;
  search(
    query: string,
    options?: { country?: string }
  ): Promise<GeocodingResult[]>;
}

export interface RoutingProvider {
  name: string;
  getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]>;
  getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult | null>;
}
