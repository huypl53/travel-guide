import { NominatimGeocodingProvider } from "./osm/geocoding";
import { OsrmRoutingProvider } from "./osm/routing";
import { GoogleGeocodingProvider } from "./google/geocoding";
import { GoogleRoutingProvider } from "./google/routing";
import { withFallback } from "./fallback";
import type { GeocodingProvider, RoutingProvider } from "./types";

export type { GeocodingProvider, RoutingProvider } from "./types";
export type {
  LatLon,
  GeocodingResult,
  DistanceMatrixEntry,
  RouteResult,
} from "./types";

function isGoogleConfigured(): boolean {
  const wantsGoogle =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === "google";
  if (!wantsGoogle) return false;

  const hasKey = !!process.env.GOOGLE_MAPS_API_KEY;
  if (!hasKey) {
    console.warn(
      "NEXT_PUBLIC_MAP_PROVIDER is set to 'google' but GOOGLE_MAPS_API_KEY is not set. Falling back to OSM providers."
    );
    return false;
  }

  return true;
}

export function getGeocodingProvider(): GeocodingProvider {
  const osm = new NominatimGeocodingProvider();
  if (isGoogleConfigured()) {
    const google = new GoogleGeocodingProvider();
    return withFallback.geocoding(google, osm);
  }
  return osm;
}

export function getRoutingProvider(): RoutingProvider {
  const osm = new OsrmRoutingProvider();
  if (isGoogleConfigured()) {
    const google = new GoogleRoutingProvider();
    return withFallback.routing(google, osm);
  }
  return osm;
}

export function getMapProvider(): "google" | "osm" {
  if (isGoogleConfigured()) {
    return "google";
  }
  return "osm";
}
