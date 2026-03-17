# Architecture

## Overview

```
+--------------------------------------------------+
|                   Browser                        |
|                                                  |
|  Landing Page ──> Trip Workspace ──> Share Page   |
|       /           /trip/[slug]     /trip/.../share|
|                                                  |
|  +-----------+  +--------+  +-----------------+  |
|  |LocationInput| |MapView |  |RankingList      |  |
|  |LocationList | |Leaflet/|  |DistanceMatrix   |  |
|  +-----------+  |Google  |  |ShareExport       |  |
|                  +--------+                      |
|                              +-----------------+  |
|                                                  |
|  Zustand Stores                                  |
|    useTripStore      (locations, selection)       |
|    useDistanceStore  (driving distances)          |
+--------------------------------------------------+
         |              |              |
   /api/geocode   /api/distances   /api/trips
         |              |              |
   Nominatim OSM   OSRM Table      Supabase
   (geocoding)     (bulk driving)  (persistence)
```

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Next.js 16 (App Router)             |
| UI Library     | React 19                            |
| State          | Zustand                             |
| Maps           | Leaflet + react-leaflet (default), Google Maps via @vis.gl/react-google-maps |
| Styling        | Tailwind CSS + shadcn/ui            |
| Database       | Supabase (PostgreSQL)               |
| Geocoding      | Nominatim (OpenStreetMap)           |
| Routing        | OSRM (Open Source Routing Machine)  |
| Testing        | Vitest + Testing Library            |

## Data Model

Defined in `supabase/migrations/001_initial.sql`.

### trips

| Column     | Type        | Notes                     |
|------------|-------------|---------------------------|
| id         | uuid (PK)   | Auto-generated            |
| name       | text        | Trip name                 |
| share_slug | text (UQ)   | Unique shareable slug     |
| created_at | timestamptz | Defaults to now()         |

### locations

| Column   | Type             | Notes                                    |
|----------|------------------|------------------------------------------|
| id       | uuid (PK)        | Auto-generated                           |
| trip_id  | uuid (FK trips)  | Cascade delete                           |
| type     | text             | 'homestay' or 'destination'              |
| name     | text             | Display name                             |
| address  | text (nullable)  | Optional address string                  |
| lat      | double precision | Latitude                                 |
| lon      | double precision | Longitude                                |
| priority | integer          | 1-5, default 3, used for ranking weight  |
| source   | text             | 'manual', 'google_maps', or 'csv'        |

### distance_cache

| Column          | Type             | Notes                          |
|-----------------|------------------|--------------------------------|
| id              | uuid (PK)        | Auto-generated                 |
| trip_id         | uuid (FK trips)  | Cascade delete                 |
| homestay_id     | uuid (FK locations) | Cascade delete              |
| destination_id  | uuid (FK locations) | Cascade delete              |
| straight_line_km| double precision | Haversine distance             |
| driving_km      | double precision (nullable) | From OSRM              |
| driving_minutes | double precision (nullable) | From OSRM              |

Unique constraint on `(homestay_id, destination_id)`.

## API Routes

### GET /api/geocode?q=...

Proxies to Nominatim OpenStreetMap search. Returns up to 5 results with `{ name, lat, lon }`. Scoped to Vietnam (`countrycodes=vn`).

### GET /api/distances?sources=lat,lon;lat,lon&destinations=lat,lon;lat,lon

Proxies to the OSRM Table API for bulk driving distance calculation. Returns `{ matrix }` where each entry contains `{ distanceKm, durationMinutes }` or `null` if no route exists. Validates coordinates and enforces a 100-coordinate limit. Uses helper functions from `src/lib/osrm.ts`.

### GET /api/directions?from=lat,lon&to=lat,lon

Proxies to OSRM for individual driving route calculation. Returns `{ distanceKm, durationMinutes }`. (Legacy — superseded by `/api/distances` for bulk operations.)

### POST /api/trips

Creates a new trip. Accepts `{ name, locations? }`. Generates a `nanoid` share slug. Optionally bulk-inserts locations. Returns `{ slug, id }`.

### GET /api/resolve-url?url=...

Follows short URL redirects (e.g., `maps.app.goo.gl/...`) server-side and returns the resolved full URL. Used by the location input to support short Google Maps links.

### GET /api/trips/[slug]

Retrieves a trip by share slug with all associated locations via Supabase join.

## Key Components

### MapView (`src/components/map-view.tsx`)

Map toggle component that selects between Leaflet (OSM) and Google Maps based on environment variables `NEXT_PUBLIC_MAP_PROVIDER` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Both map providers are loaded client-side via `next/dynamic`. Defaults to Leaflet/OSM when no Google config is present.

### LeafletMap (`src/components/map-providers/leaflet-map.tsx`)

Interactive Leaflet map (OSM tiles). Displays blue markers for homestays and red markers for destinations. Fetches driving route geometries from OSRM for all homestays and draws them as polylines color-coded by driving distance (green = close, red = far). Falls back to straight lines if route geometry is unavailable. Unselected homestays/destinations have dimmed markers (opacity 0.4) and dimmed routes (opacity 0.15). Default center: Da Lat, Vietnam.

### GoogleMap (`src/components/map-providers/google-map.tsx`)

Google Maps equivalent using `@vis.gl/react-google-maps`. Uses `AdvancedMarker` with colored `Pin` components and `google.maps.Polyline` for route visualization. Renders routes for all homestays with opacity-based dimming for unselected items. Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and a Maps JavaScript API key with Map ID configured.

### LocationInput / LocationList (`src/components/location-input.tsx`, `location-list.tsx`)

Input panels for adding locations. Supports Google Maps URL pasting, CSV/JSON upload, and manual coordinate entry. LocationList renders added locations with remove actions. Both accept a `type` prop (`"homestay"` or `"destination"`).

### RankingList (`src/components/ranking-list.tsx`)

Displays homestays ranked by weighted average distance to all destinations. Priority stars on destinations affect the weighting.

### DistanceMatrix (`src/components/distance-matrix.tsx`)

Pairwise distance table between homestays and destinations. Each cell shows driving distance and duration (with car icon) when available, or haversine distance with a loading spinner while driving distances are being fetched.

### ShareExport (`src/components/share-export.tsx`)

Share button saves the trip via `POST /api/trips` and copies the read-only URL (`/trip/[slug]/share`) to clipboard. Export button downloads trip data as `.json`.

### PriorityStars (`src/components/priority-stars.tsx`)

Star rating input for setting destination priority (1-5), used in the location list.

## State Management

### useTripStore (`src/store/trip-store.ts`)

| Field                | Type              | Description                             |
|----------------------|-------------------|-----------------------------------------|
| tripName             | string            | Current trip name                       |
| locations            | Location[]        | All homestays and destinations          |
| selectedHomestayId   | string or null    | Currently selected homestay for map     |
| selectedHomestayIds  | Set\<string\>     | Homestays included in visual comparison |
| selectedDestinationIds | Set\<string\>   | Destinations included in visual comparison |

Actions: `setTripName`, `addLocation`, `removeLocation`, `updatePriority`, `setSelectedHomestay`, `toggleLocationSelection`, `selectAllByType`, `deselectAllByType`, `reset`.

Components read from the store and filter by `type` to get homestays or destinations.

#### Selection & Visual Dimming

New locations are auto-added to their selection set on creation and removed on deletion. All components read `selectedHomestayIds` / `selectedDestinationIds` and apply `opacity-40` (CSS) or `opacity: 0.4` (Leaflet/Google Maps) to unselected items. This propagates across location lists, ranking list, distance matrix, map markers, and route polylines — enabling visual comparison by toggling items on/off.

### useDistanceStore (`src/store/distance-store.ts`)

| Field         | Type                               | Description                                       |
|---------------|------------------------------------|----------------------------------------------------|
| distances     | Map\<string, DrivingDistance\>     | Driving distances keyed by `homestayId:destId`      |
| routes        | Map\<string, [number, number][]\>  | Route geometries keyed by `homestayId:destId`       |
| routesLoading | boolean                            | True while fetching route geometries                |
| loading       | boolean                            | True while fetching from OSRM                      |
| error         | string or null                     | Error message if fetch failed                      |

Actions: `fetchDistances(homestays, destinations)`, `fetchRoutes(homestay, destinations)`, `clearDistances()`, `clear()`.

Route fetching uses a concurrency limiter (max 3 parallel requests) to avoid overwhelming the OSRM server. Routes are cached by `homestayId:destId` key and preserved across distance recalculations — only `clearDistances()` is called when locations change, while `clear()` (which also wipes routes) is reserved for full trip reset.

The `useAutoFetchDistances` hook (`src/hooks/use-auto-fetch-distances.ts`) watches the trip store's locations and debounces (300ms) a call to `fetchDistances` whenever homestays or destinations change. Map components fetch route geometries for all homestays (not just the selected one), rendering selected routes at full opacity and unselected routes dimmed.

## Utility Libraries

### Parsers (`src/lib/parsers.ts`)

- `parseGoogleMapsUrl(url)` -- Extracts lat/lon/name from Google Maps URLs.
- `parseCsvLocations(csv)` -- Parses CSV with `name,lat,lon` columns.
- `parseJsonLocations(json)` -- Parses JSON array of location objects.

### Distance (`src/lib/distance.ts`)

Haversine formula for straight-line distance between two coordinates.

### OSRM Helpers (`src/lib/osrm.ts`)

- `buildOsrmTableUrl(sources, destinations)` -- Builds the OSRM Table API URL with proper lon/lat ordering and source/destination indices.
- `parseTableResponse(response, sourceCount, destCount)` -- Parses the OSRM response into a matrix of `{ distanceKm, durationMinutes }` entries.

### Ranking (`src/lib/ranking.ts`)

Computes weighted average distance from each homestay to all destinations, using destination priority as weights. Accepts an optional `drivingDistances` map — when a driving distance is available for a homestay-destination pair, it is used instead of the haversine distance. Returns sorted `RankedHomestay[]`.

### Types (`src/lib/types.ts`)

TypeScript interfaces: `Location`, `DistanceEntry`, `RankedHomestay`.

### Supabase Client (`src/lib/supabase.ts`)

Initializes the Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## External Services

| Service    | Purpose                | Rate Limits                       |
|------------|------------------------|-----------------------------------|
| Nominatim  | Address geocoding      | 1 req/sec (OSM usage policy)      |
| OSRM       | Driving route distance | Public demo server, best-effort   |
| Supabase   | Database persistence   | Free tier: 500 MB, 2 GB transfer  |

All three are free and require no API keys (Supabase uses project URL + anon key).

## Authentication

### Architecture

Authentication uses **Supabase Auth** with `@supabase/ssr` for cookie-based session management. Two sign-in methods are supported:

- **Google OAuth** — redirects through Supabase's OAuth flow
- **Magic link** — passwordless email sign-in

Sessions are stored in cookies and refreshed automatically by Next.js middleware (`src/middleware.ts`), which runs on every request to keep the Supabase auth token fresh. Row Level Security (RLS) policies on all tables ensure users can only access their own data.

### Middleware (`src/middleware.ts`)

Refreshes the Supabase auth session on every request using `@supabase/ssr`. This ensures the server-side Supabase client always has a valid session token when rendering pages or handling API calls.

### New Components

| Component        | File                                  | Description                                                  |
|------------------|---------------------------------------|--------------------------------------------------------------|
| Header           | `src/components/header.tsx`           | Top navigation bar with sign-in/sign-out and user avatar     |
| AuthDialog       | `src/components/auth-dialog.tsx`      | Modal dialog for Google OAuth and magic link sign-in         |
| TripCard         | `src/components/trip-card.tsx`        | Card displaying a saved trip summary (name, date, locations) |
| MyTripsList      | `src/components/my-trips-list.tsx`    | Grid of TripCards for the logged-in user's saved trips       |
| AnonLanding      | `src/components/anon-landing.tsx`     | Landing page content shown to anonymous (non-authenticated) users |
| SaveTripButton   | `src/components/save-trip-button.tsx` | Button on shared trip pages to save a trip to the user's account |

### Database Changes

#### `trips` table — new column

| Column  | Type          | Notes                                      |
|---------|---------------|--------------------------------------------|
| user_id | uuid (nullable) | FK to `auth.users`, owner of the trip    |

#### `saved_trips` join table (new)

| Column   | Type             | Notes                          |
|----------|------------------|--------------------------------|
| id       | uuid (PK)        | Auto-generated                 |
| user_id  | uuid (FK auth.users) | The user who saved the trip |
| trip_id  | uuid (FK trips)  | The saved trip                 |
| saved_at | timestamptz      | Defaults to now()              |

Unique constraint on `(user_id, trip_id)`.

#### RLS Policies

Row Level Security is enabled on all tables (`trips`, `locations`, `distance_cache`, `saved_trips`). Policies enforce:

- Users can read any trip (public sharing still works)
- Users can only insert/update/delete their own trips
- Users can only manage their own saved trips entries

### Auto-Save (`src/hooks/use-auto-save.ts`)

The `useAutoSave(slug)` hook provides automatic trip persistence for logged-in users:

1. **On mount**: checks if the user is authenticated. If so, looks up the trip by `share_slug`. If found, loads its locations into the Zustand store. If not found, creates a new trip in Supabase.
2. **On store changes**: subscribes to the Zustand store and debounce-saves (2-second delay) to Supabase after each change. A save updates the trip name, deletes all existing locations for the trip, and re-inserts the current locations.
3. **Anonymous users**: the hook is a no-op -- all DB operations are skipped.

The hook is called from the trip workspace page (`src/app/trip/[slug]/page.tsx`).

### New API Routes

#### GET /api/auth/callback

Handles the OAuth redirect from Supabase Auth. Exchanges the authorization code for a session and sets session cookies.

#### GET/POST/DELETE /api/saved-trips

Manages saved trips for the authenticated user. `GET` returns all saved trips, `POST` saves a trip by ID, `DELETE` removes a saved trip.
