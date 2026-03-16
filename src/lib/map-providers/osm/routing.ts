import type {
  RoutingProvider,
  LatLon,
  DistanceMatrixEntry,
  RouteResult,
} from "../types";
import {
  buildOsrmTableUrl,
  parseTableResponse,
  buildOsrmRouteUrl,
  decodePolyline,
} from "@/lib/osrm";

export class OsrmRoutingProvider implements RoutingProvider {
  name = "osrm";

  async getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]> {
    const url = buildOsrmTableUrl(sources, destinations);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM table request failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.code !== "Ok") {
      throw new Error(`OSRM table error: ${data.code}`);
    }
    return parseTableResponse(data, sources.length, destinations.length);
  }

  async getRoute(
    origin: LatLon,
    destination: LatLon
  ): Promise<RouteResult | null> {
    const url = buildOsrmRouteUrl(origin, destination);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM route request failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length || !data.routes[0].geometry) {
      return null;
    }
    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: decodePolyline(route.geometry),
    };
  }
}
