import { NominatimGeocodingProvider } from "./osm/geocoding";
import { OsrmRoutingProvider } from "./osm/routing";
import { GoogleGeocodingProvider } from "./google/geocoding";
import { GoogleRoutingProvider } from "./google/routing";
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
  if (isGoogleConfigured()) {
    return new GoogleGeocodingProvider();
  }
  return new NominatimGeocodingProvider();
}

export function getRoutingProvider(): RoutingProvider {
  if (isGoogleConfigured()) {
    return new GoogleRoutingProvider();
  }
  return new OsrmRoutingProvider();
}

export function getMapProvider(): "google" | "osm" {
  if (isGoogleConfigured()) {
    return "google";
  }
  return "osm";
}
