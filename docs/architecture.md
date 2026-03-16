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

### Data Input Panel (`src/components/location-input.tsx`, `src/components/location-list.tsx`)

- **`LocationInput`** - Input component for adding locations. Accepts a `type` prop (`"homestay"` or `"destination"`) to target the correct store slice. Supports Google Maps URL pasting, CSV/JSON upload, and manual coordinate entry.
- **`LocationList`** - Displays added locations for a given type with remove actions.

### Ranking & Distance (`src/components/ranking-list.tsx`, `src/components/distance-matrix.tsx`)

- **`RankingList`** - Shows homestays ranked by average distance to all destinations.
- **`DistanceMatrix`** - Displays a pairwise distance table between homestays and destinations. Each cell includes a `DrivingTimeButton` for on-demand driving distance/time lookup.
- **`DrivingTimeButton`** (`src/components/driving-time-button.tsx`) - A small button rendered inside each distance matrix cell. When clicked, fetches driving distance and duration from the `/api/directions` endpoint (backed by OSRM) and displays the result inline (e.g., "12.3km / 18min").

## Pages (`src/app/`)

### Landing Page (`src/app/page.tsx`)

Client component that displays the app title and a "New Trip" button. Clicking the button generates a random 10-character slug via `nanoid` and navigates to `/trip/[slug]`.

### Trip Workspace (`src/app/trip/[slug]/page.tsx`)

The main workspace page. Composes all UI components in a responsive grid layout:
- Header with Share/Export actions
- Two-column input panel (Homestays + Destinations) using `LocationInput` and `LocationList`
- Full-width `MapView` (300px tall on mobile, 500px on desktop)
- Two-column bottom section with `RankingList` and `DistanceMatrix`

On mobile screens (`< md` breakpoint), the ranking and distance matrix are moved into a fixed bottom sheet panel that can be toggled open/closed, keeping the main content area uncluttered. A `pb-16` padding is applied to the main container on mobile to prevent content from being hidden behind the bottom bar.

### Share & Export (`src/components/share-export.tsx`)

- **`ShareExport`** - Renders Share and Export buttons in the trip page header. Share saves the trip via `POST /api/trips` and copies the read-only share URL (`/trip/[slug]/share`) to the clipboard. Export downloads the current trip data (name + locations) as a `.json` file.

### Shared Trip Page (`src/app/trip/[slug]/share/page.tsx`)

Server component that loads a trip by its share slug from Supabase and renders a read-only view. Displays homestays and destinations in a two-column grid. Returns a 404 if the trip is not found.

## API Routes (`src/app/api/`)

### Trips CRUD (`src/app/api/trips/`)

- **`POST /api/trips`** - Creates a new trip with a unique `nanoid`-generated share slug. Accepts `{ name, locations? }` in the request body. Optionally bulk-inserts associated locations into the `locations` table. Returns `{ slug, id }`.
- **`GET /api/trips/[slug]`** - Retrieves a trip by its share slug, including all associated locations via a Supabase join (`*, locations(*)`).
