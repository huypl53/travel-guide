# Architecture

## Utility Libraries (`src/lib/`)

### Parsers (`src/lib/parsers.ts`)

Location parsing utilities for multiple input formats:

- **`parseGoogleMapsUrl(url)`** - Extracts lat/lon/name from Google Maps URLs (supports `@lat,lon` and `?q=lat,lon` formats).
- **`parseCsvLocations(csv)`** - Parses CSV text with `name,lat,lon` columns (optional `address` column). Skips rows with invalid coordinates.
- **`parseJsonLocations(json)`** - Parses a JSON string containing an array of `{name, lat, lon, address?}` objects. Returns empty array on invalid input.

All parsers return structured location objects and handle malformed input gracefully.

## Components (`src/components/`)

### Map View (`src/components/map-view.tsx`, `src/components/map-inner.tsx`)

Interactive Leaflet map rendered client-side via `next/dynamic` (SSR disabled since Leaflet requires `window`).

- **`MapView`** - Dynamic wrapper that lazy-loads `MapInner` with a skeleton placeholder.
- **`MapInner`** - The actual map using `react-leaflet`. Displays homestay markers (blue) and destination markers (red). When a homestay is selected, draws polylines to each destination color-coded by distance (green = close, red = far) using the haversine function. Centers on the average of all locations, defaulting to Da Lat, Vietnam.

## API Routes (`src/app/api/`)

### Trips CRUD (`src/app/api/trips/`)

- **`POST /api/trips`** - Creates a new trip with a unique `nanoid`-generated share slug. Accepts `{ name, locations? }` in the request body. Optionally bulk-inserts associated locations into the `locations` table. Returns `{ slug, id }`.
- **`GET /api/trips/[slug]`** - Retrieves a trip by its share slug, including all associated locations via a Supabase join (`*, locations(*)`).
