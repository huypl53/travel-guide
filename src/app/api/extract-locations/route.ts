import { NextRequest, NextResponse } from "next/server";
import {
  extractUrlsFromText,
  isShortMapsUrl,
  isDirectionsUrl,
  parseDirectionsUrl,
  parseGoogleMapsUrl,
} from "@/lib/parsers";
import { getGeocodingProvider } from "@/lib/map-providers";

interface ExtractedLocation {
  name: string;
  lat: number;
  lon: number;
  address: string | null;
}

const MAX_URLS = 10;
const MAX_LOCATIONS = 20;

async function resolveUrl(url: string): Promise<string> {
  if (!isShortMapsUrl(url)) return url;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(5000),
  });
  return res.url;
}

async function processUrl(
  resolvedUrl: string,
  geocoder: ReturnType<typeof getGeocodingProvider>
): Promise<{ locations: ExtractedLocation[]; errors: string[] }> {
  const locations: ExtractedLocation[] = [];
  const errors: string[] = [];

  if (isDirectionsUrl(resolvedUrl)) {
    const waypoints = parseDirectionsUrl(resolvedUrl);
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (wp.coords) {
        locations.push({
          name: wp.raw,
          lat: wp.coords.lat,
          lon: wp.coords.lon,
          address: null,
        });
      } else {
        // Rate limit Nominatim: 1 req/sec
        if (i > 0) await new Promise((r) => setTimeout(r, 1100));
        try {
          const results = await geocoder.search(wp.raw);
          if (results.length > 0) {
            locations.push({
              name: wp.raw,
              lat: results[0].lat,
              lon: results[0].lon,
              address: results[0].name,
            });
          } else {
            errors.push(`Could not geocode "${wp.raw}"`);
          }
        } catch {
          errors.push(`Geocoding failed for "${wp.raw}"`);
        }
      }
    }
  } else {
    const parsed = parseGoogleMapsUrl(resolvedUrl);
    if (parsed) {
      locations.push({
        name: parsed.name ?? "Unnamed",
        lat: parsed.lat,
        lon: parsed.lon,
        address: null,
      });
    } else {
      errors.push(`Could not parse location from URL`);
    }
  }

  return { locations, errors };
}

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body?.text;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text field" }, { status: 400 });
  }

  const urls = extractUrlsFromText(text);
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "No Google Maps URLs found" },
      { status: 400 }
    );
  }
  if (urls.length > MAX_URLS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_URLS} URLs per request` },
      { status: 400 }
    );
  }

  // Resolve short URLs in parallel (no rate limit concern)
  const resolvedUrls = await Promise.allSettled(
    urls.map((url) => resolveUrl(url))
  );

  // Process sequentially to respect Nominatim 1 req/sec rate limit
  const geocoder = getGeocodingProvider();
  const allLocations: ExtractedLocation[] = [];
  const allErrors: string[] = [];

  for (let i = 0; i < resolvedUrls.length; i++) {
    const resolved = resolvedUrls[i];
    if (resolved.status === "rejected") {
      allErrors.push(`Failed to resolve URL: ${urls[i]}`);
      continue;
    }
    try {
      const result = await processUrl(resolved.value, geocoder);
      allLocations.push(...result.locations);
      allErrors.push(...result.errors);
    } catch {
      allErrors.push(`Failed to process URL: ${urls[i]}`);
    }
  }

  if (allLocations.length > MAX_LOCATIONS) {
    return NextResponse.json(
      {
        locations: allLocations.slice(0, MAX_LOCATIONS),
        errors: [
          ...allErrors,
          `Truncated to ${MAX_LOCATIONS} locations (found ${allLocations.length})`,
        ],
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ locations: allLocations, errors: allErrors });
}
