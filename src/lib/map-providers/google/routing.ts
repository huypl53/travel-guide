import type {
  RoutingProvider,
  LatLon,
  DistanceMatrixEntry,
  RouteResult,
} from "../types";
import { decodePolyline } from "@/lib/osrm";

export class GoogleRoutingProvider implements RoutingProvider {
  name = "google";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDistanceMatrix(
    sources: LatLon[],
    destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]> {
    const origins = sources.map((s) => `${s.lat},${s.lon}`).join("|");
    const dests = destinations.map((d) => `${d.lat},${d.lon}`).join("|");

    const params = new URLSearchParams({
      origins,
      destinations: dests,
      key: this.apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Distance Matrix API HTTP error: ${res.status}`);
    }
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error(
        `Google Distance Matrix API error: ${data.status} - ${data.error_message ?? ""}`
      );
    }

    return data.rows.map(
      (row: { elements: Array<{ status: string; distance?: { value: number }; duration?: { value: number } }> }) =>
        row.elements.map(
          (el: { status: string; distance?: { value: number }; duration?: { value: number } }) => {
            if (el.status !== "OK") return null;
            return {
              distanceKm: el.distance!.value / 1000,
              durationMinutes: el.duration!.value / 60,
            };
          }
        )
    );
  }

  async getRoute(
    origin: LatLon,
    destination: LatLon
  ): Promise<RouteResult | null> {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lon}`,
      destination: `${destination.lat},${destination.lon}`,
      key: this.apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Directions API HTTP error: ${res.status}`);
    }
    const data = await res.json();

    if (data.status === "ZERO_RESULTS" || (data.status === "OK" && (!data.routes || data.routes.length === 0))) {
      return null;
    }

    if (data.status !== "OK") {
      throw new Error(
        `Google Directions API error: ${data.status} - ${data.error_message ?? ""}`
      );
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      distanceKm: leg.distance.value / 1000,
      durationMinutes: leg.duration.value / 60,
      geometry: decodePolyline(route.overview_polyline.points),
    };
  }
}
