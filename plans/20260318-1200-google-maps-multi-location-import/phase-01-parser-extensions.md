# Phase 1: Parser Extensions

## Context Links
- Current parsers: `src/lib/parsers.ts`
- Research: `plans/20260318-1200-google-maps-multi-location-import/plan.md`

## Overview
Add three pure functions to `src/lib/parsers.ts` for detecting and parsing directions URLs and extracting multiple URLs from text.

## Key Insights
- Directions URLs follow pattern: `google.com/maps/dir/WaypointA/WaypointB/@lat,lon,...`
- Waypoints can be place names (URL-encoded) or `lat,lon` coordinates
- The `@lat,lon` at the end is the viewport center, NOT a waypoint -- must be excluded
- Multiple URLs in text are separated by newlines, spaces, or commas

## Requirements
1. `isDirectionsUrl(url)` - returns true if URL contains `/maps/dir/`
2. `parseDirectionsUrl(url)` - extracts waypoint strings from path segments
3. `extractUrlsFromText(text)` - finds all Google Maps URLs in freeform text
4. `isMultiLocationInput(text)` - quick check: has directions URL OR multiple Maps URLs

## Architecture
All functions are pure, no async, no side effects. They produce intermediate data that the API endpoint will geocode/resolve.

```
parseDirectionsUrl(url) -> Array<{ raw: string, coords: {lat,lon} | null }>
```

Waypoints with coords (e.g. `10.123,106.456`) return coords directly. Named waypoints (e.g. `Da+Lat`) return `coords: null` -- API endpoint handles geocoding.

## Related Code Files
- `src/lib/parsers.ts` (modify)

## Implementation Steps

### 1. Add `isDirectionsUrl`
```typescript
export function isDirectionsUrl(url: string): boolean {
  return /google\.\w+\/maps\/dir\//.test(url);
}
```

### 2. Add `parseDirectionsUrl`
```typescript
interface DirectionsWaypoint {
  raw: string;       // original text, decoded
  coords: { lat: number; lon: number } | null;
}

export function parseDirectionsUrl(url: string): DirectionsWaypoint[] {
  // Extract path after /maps/dir/
  const dirMatch = url.match(/\/maps\/dir\/([^?#]+)/);
  if (!dirMatch) return [];

  const segments = dirMatch[1].split("/").filter(Boolean);

  return segments
    .filter(seg => !seg.startsWith("@"))  // skip viewport
    .map(seg => {
      const decoded = decodeURIComponent(seg.replace(/\+/g, " "));
      const coordMatch = decoded.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      return {
        raw: decoded,
        coords: coordMatch
          ? { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) }
          : null,
      };
    })
    .filter(wp => wp.raw.trim().length > 0);
}
```

### 3. Add `extractUrlsFromText`
```typescript
export function extractUrlsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/(?:www\.)?(?:google\.\w+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)\S+/gi;
  return [...text.matchAll(urlPattern)].map(m => m[0]);
}
```

### 4. Add `isMultiLocationInput`
```typescript
export function isMultiLocationInput(text: string): boolean {
  const urls = extractUrlsFromText(text);
  if (urls.length > 1) return true;
  if (urls.length === 1 && isDirectionsUrl(urls[0])) return true;
  return false;
}
```

### 5. Export `ParsedFileLocation` type
Currently `ParsedFileLocation` is not exported. Export it since the API and dialog need it.

## Todo List
- [ ] Add `DirectionsWaypoint` interface
- [ ] Add `isDirectionsUrl()` function
- [ ] Add `parseDirectionsUrl()` function
- [ ] Add `extractUrlsFromText()` function
- [ ] Add `isMultiLocationInput()` function
- [ ] Export `ParsedFileLocation` type

## Success Criteria
- `parseDirectionsUrl("https://google.com/maps/dir/Da+Lat/10.1,106.5/@10.5,106.7,12z")` returns 2 waypoints (Da Lat with null coords, second with coords)
- `extractUrlsFromText` finds URLs separated by newlines, spaces
- `isMultiLocationInput` returns false for single place URLs
- All functions are pure with no side effects

## Risk Assessment
- **Low**: URL format changes -- Google rarely changes path structure for directions
- **Low**: Edge case with encoded characters in place names -- `decodeURIComponent` handles most cases

## Security Considerations
- No user input executed; only regex matching and string splitting
- `decodeURIComponent` is safe for untrusted input (throws on malformed, caught by caller)

## Next Steps
Phase 2 uses these parsers in the API endpoint.
