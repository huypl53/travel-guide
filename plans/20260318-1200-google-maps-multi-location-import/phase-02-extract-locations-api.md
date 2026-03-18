# Phase 2: Extract Locations API

## Context Links
- Phase 1: `plans/20260318-1200-google-maps-multi-location-import/phase-01-parser-extensions.md`
- Existing resolve-url: `src/app/api/resolve-url/route.ts`
- Existing geocode: `src/app/api/geocode/route.ts`
- Map providers: `src/lib/map-providers/index.ts`

## Overview
Create `POST /api/extract-locations` endpoint that accepts text containing Google Maps URLs, resolves short URLs, parses directions, geocodes named waypoints, and returns an array of locations.

## Key Insights
- Short URL resolution requires `fetch` with redirect follow (already proven in resolve-url endpoint)
- Nominatim geocoding available via `getGeocodingProvider()` -- reuse existing abstraction
- Must handle mixed input: some URLs are directions, some are single places, some are short URLs
- Process URLs in parallel with `Promise.allSettled` for resilience

## Requirements
1. Accept POST body `{ text: string }`
2. Extract all Google Maps URLs from text
3. For each URL: resolve if short -> detect if directions or single place -> parse
4. For directions: geocode named waypoints via Nominatim
5. Return `{ locations: Array<{name, lat, lon, address}>, errors: string[] }`
6. Rate limit: max 10 URLs per request, max 20 waypoints total

## Architecture

```
POST /api/extract-locations
Body: { text: string }

Flow per URL:
  1. isShortMapsUrl? -> fetch redirect -> get resolved URL
  2. isDirectionsUrl? -> parseDirectionsUrl -> for each waypoint:
     - has coords? -> use directly
     - named? -> geocode via provider
  3. else -> parseGoogleMapsUrl -> single location

Response: {
  locations: Array<{ name: string; lat: number; lon: number; address: string | null }>,
  errors: string[]
}
```

## Related Code Files
- `src/app/api/extract-locations/route.ts` (CREATE)
- `src/lib/parsers.ts` (consume new functions)
- `src/lib/map-providers/index.ts` (use `getGeocodingProvider`)

## Implementation Steps

### 1. Create route file
```typescript
// src/app/api/extract-locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  extractUrlsFromText,
  isShortMapsUrl,
  isDirectionsUrl,
  parseDirectionsUrl,
  parseGoogleMapsUrl,
} from "@/lib/parsers";
import { getGeocodingProvider } from "@/lib/map-providers";
```

### 2. Input validation
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = body?.text;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text field" }, { status: 400 });
  }

  const urls = extractUrlsFromText(text);
  if (urls.length === 0) {
    return NextResponse.json({ error: "No Google Maps URLs found" }, { status: 400 });
  }
  if (urls.length > 10) {
    return NextResponse.json({ error: "Maximum 10 URLs per request" }, { status: 400 });
  }
  // ... processing
}
```

### 3. URL resolution helper
```typescript
async function resolveUrl(url: string): Promise<string> {
  if (!isShortMapsUrl(url)) return url;
  const res = await fetch(url, { redirect: "follow" });
  return res.url;
}
```

### 4. Single URL processing
```typescript
async function processUrl(url: string, geocoder: GeocodingProvider) {
  const resolved = await resolveUrl(url);
  const locations: Array<{name, lat, lon, address}> = [];

  if (isDirectionsUrl(resolved)) {
    const waypoints = parseDirectionsUrl(resolved);
    for (const wp of waypoints) {
      if (wp.coords) {
        locations.push({
          name: wp.raw, lat: wp.coords.lat,
          lon: wp.coords.lon, address: null,
        });
      } else {
        // Geocode named waypoint
        const results = await geocoder.search(wp.raw, { country: "vn" });
        if (results.length > 0) {
          locations.push({
            name: wp.raw,
            lat: results[0].lat, lon: results[0].lon,
            address: results[0].name,
          });
        }
        // else: skip, add to errors
      }
    }
  } else {
    const parsed = parseGoogleMapsUrl(resolved);
    if (parsed) {
      locations.push({
        name: parsed.name ?? "Unnamed",
        lat: parsed.lat, lon: parsed.lon, address: null,
      });
    }
  }
  return locations;
}
```

### 5. Parallel processing with error collection
```typescript
const geocoder = getGeocodingProvider();
const errors: string[] = [];
const allLocations: ExtractedLocation[] = [];

const results = await Promise.allSettled(
  urls.map(url => processUrl(url, geocoder))
);

for (let i = 0; i < results.length; i++) {
  const result = results[i];
  if (result.status === "fulfilled") {
    allLocations.push(...result.value);
  } else {
    errors.push(`Failed to process URL ${i + 1}: ${urls[i]}`);
  }
}

// Enforce total waypoint limit
if (allLocations.length > 20) {
  return NextResponse.json({
    error: "Too many locations extracted (max 20)"
  }, { status: 400 });
}

return NextResponse.json({ locations: allLocations, errors });
```

### 6. Add delay between Nominatim requests
Nominatim has 1 req/sec policy. Add small delay between geocoding calls within a single directions URL.

```typescript
// Inside the waypoint loop for directions:
if (wpIndex > 0) await new Promise(r => setTimeout(r, 1100));
```

## Todo List
- [ ] Create `src/app/api/extract-locations/route.ts`
- [ ] Implement POST handler with input validation
- [ ] Implement `resolveUrl` helper
- [ ] Implement `processUrl` with directions + single-place branching
- [ ] Add Nominatim rate limiting (1.1s delay between geocode calls)
- [ ] Add `Promise.allSettled` parallel processing
- [ ] Add error collection and response formatting
- [ ] Enforce limits (10 URLs, 20 waypoints)

## Success Criteria
- Directions URL with 3 waypoints returns 3 locations
- Mix of short URLs and full URLs processed correctly
- Named waypoints geocoded to coordinates
- Errors for unresolvable URLs returned without failing entire request
- Rate limits respected for Nominatim

## Risk Assessment
- **Medium**: Nominatim rate limiting -- mitigated with 1.1s delays between geocode calls
- **Low**: Short URL resolution timeout -- set 5s timeout on fetch
- **Low**: Geocoding returns wrong location -- user previews in dialog (Phase 3)

## Security Considerations
- Validate input is string, enforce URL count limit
- Only follow redirects to google.com domains (validate resolved URL origin)
- No user input passed to shell or eval
- Rate limit protects against abuse of Nominatim

## Next Steps
Phase 3 builds the preview dialog that displays these extracted locations.
