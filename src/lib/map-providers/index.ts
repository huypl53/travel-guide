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

let _googleConfigured: boolean | null = null;

function isGoogleConfigured(): boolean {
  if (_googleConfigured !== null) return _googleConfigured;

  const wantsGoogle =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === "google";
  if (!wantsGoogle) {
    _googleConfigured = false;
    return false;
  }

  const hasKey = !!process.env.GOOGLE_MAPS_API_KEY;
  if (!hasKey) {
    console.warn(
      "NEXT_PUBLIC_MAP_PROVIDER is set to 'google' but GOOGLE_MAPS_API_KEY is not set. Falling back to OSM providers."
    );
    _googleConfigured = false;
    return false;
  }

  _googleConfigured = true;
  return true;
}

let _geocodingProvider: GeocodingProvider | null = null;
let _routingProvider: RoutingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (_geocodingProvider) return _geocodingProvider;

  const osm = new NominatimGeocodingProvider();
  if (isGoogleConfigured()) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
    const google = new GoogleGeocodingProvider(apiKey);
    _geocodingProvider = withFallback.geocoding(google, osm);
  } else {
    _geocodingProvider = osm;
  }
  return _geocodingProvider;
}

export function getRoutingProvider(): RoutingProvider {
  if (_routingProvider) return _routingProvider;

  const osm = new OsrmRoutingProvider();
  if (isGoogleConfigured()) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
    const google = new GoogleRoutingProvider(apiKey);
    _routingProvider = withFallback.routing(google, osm);
  } else {
    _routingProvider = osm;
  }
  return _routingProvider;
}

export function getMapProvider(): "google" | "osm" {
  if (isGoogleConfigured()) {
    return "google";
  }
  return "osm";
}
