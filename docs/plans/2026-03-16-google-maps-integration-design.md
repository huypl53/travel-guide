# Google Maps Integration Design

## Summary

Add Google Maps as an alternative map provider alongside the existing OSM/Leaflet/OSRM stack. Build a provider abstraction layer that allows switching between providers via environment variable, with automatic fallback to OSM when Google APIs fail or are not configured.

## Requirements

- Full replacement: map rendering, geocoding, and routing all switchable to Google
- Stay within Google's $200/month free credit (free tier only)
- Environment variable toggle (`MAP_PROVIDER=google|osm`, default `osm`)
- Auto-fallback to OSM/OSRM/Nominatim on Google API failure or missing key
- No changes to database schema, stores, or ranking logic

## Architecture: Interface-First Abstraction

### Provider Interfaces

```typescript
// src/lib/map-providers/types.ts

type LatLon = { lat: number; lon: number }
type GeocodingResult = { name: string; lat: number; lon: number }
type DistanceEntry = { distanceKm: number; durationMinutes: number }
type DistanceMatrix = DistanceEntry[][]
type RouteResult = { distanceKm: number; durationMinutes: number; geometry: [number, number][] }

interface GeocodingProvider {
  search(query: string, options?: { country?: string }): Promise<GeocodingResult[]>
}

interface RoutingProvider {
  getDistanceMatrix(sources: LatLon[], destinations: LatLon[]): Promise<DistanceMatrix>
  getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult>
}
```

### File Structure

```
src/lib/map-providers/
  types.ts          -- Shared interfaces and types
  index.ts          -- Provider factory + fallback logic
  osm/
    geocoding.ts    -- Nominatim implementation (moved from api/geocode)
    routing.ts      -- OSRM implementation (moved from lib/osrm.ts + api routes)
  google/
    geocoding.ts    -- Google Geocoding API
    routing.ts      -- Google Distance Matrix + Directions API

src/components/map-providers/
  leaflet-map.tsx   -- Existing map-inner.tsx refactored to MapProps
  google-map.tsx    -- Google Maps via @vis.gl/react-google-maps
```

### Map Rendering

Both map components accept a standardized `MapProps` interface:

```typescript
interface MapProps {
  center: LatLon
  locations: Location[]
  routes: Map<string, RouteResult>
  selectedHomestayId: string | null
  onLocationClick: (id: string) => void
}
```

- `map-view.tsx` conditionally loads the right component via `next/dynamic` based on env var
- If `MAP_PROVIDER=google` but `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, falls back to Leaflet at load time with a console warning
- No mid-session rendering fallback (would be jarring)

### API Routes & Fallback

Geocoding and routing API routes call the configured provider, with try/catch fallback:

```
Google API call
  +-- Success -> return result
  +-- Failure -> log warning, retry with OSM/OSRM
                   +-- Success -> return result
                   +-- Failure -> return error (or haversine for distances)
```

- Distance cache in Supabase stays unchanged
- Haversine fallback remains as last resort
- No changes to Zustand stores or ranking algorithm

### Environment Variables

```
MAP_PROVIDER=google                          # or "osm" (default)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx          # client-side (map rendering)
GOOGLE_MAPS_API_KEY=xxx                      # server-side (geocoding, routing)
```

If neither Google key is set and `MAP_PROVIDER=google`, the app falls back to OSM with a console warning.

## Google Maps APIs Used

| API | Purpose | Free tier (~$200/month credit) |
|-----|---------|-------------------------------|
| Maps JavaScript API | Map rendering | ~28k loads/month |
| Geocoding API | Address search | ~40k requests/month |
| Distance Matrix API | Bulk distances | ~40k elements/month |
| Directions API | Route geometry | ~40k requests/month |

Cost is controlled by existing distance cache (prevents duplicate calls) and geocoding debounce (300ms).

## Dependencies

**New:**
- `@vis.gl/react-google-maps` -- Official React wrapper for Google Maps JS SDK

**Unchanged:**
- `leaflet` + `react-leaflet` -- Remain as OSM provider
- No server-side Google client library needed (REST calls via fetch)

## Testing

- Unit tests for provider factory and fallback logic
- Unit tests for Google geocoding/routing response parsing
- Existing tests for ranking, haversine, stores remain unchanged
- Manual testing for map rendering (both providers)

## Migration Path

- Default is `osm` -- existing deployments work without any changes
- To enable Google: set 3 env vars, done
- No database migrations needed

## Google Cloud Setup

1. Create project in Google Cloud Console
2. Enable Maps JavaScript, Geocoding, Distance Matrix, Directions APIs
3. Create API key with HTTP referrer restrictions (client) and IP restrictions (server)
4. Set billing budget alert at $0
