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
|  |LocationList | |MapInner|  |DistanceMatrix   |  |
|  +-----------+  +--------+  |DrivingTimeButton |  |
|                              |ShareExport       |  |
|                              +-----------------+  |
|                                                  |
|  Zustand Store (useTripStore)                    |
+--------------------------------------------------+
         |              |              |
   /api/geocode   /api/directions  /api/trips
         |              |              |
   Nominatim OSM     OSRM          Supabase
   (geocoding)     (routing)    (persistence)
```

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Next.js 16 (App Router)             |
| UI Library     | React 19                            |
| State          | Zustand                             |
| Maps           | Leaflet + react-leaflet             |
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

### GET /api/directions?from=lat,lon&to=lat,lon

Proxies to OSRM for driving route calculation. Returns `{ distanceKm, durationMinutes }`.

### POST /api/trips

Creates a new trip. Accepts `{ name, locations? }`. Generates a `nanoid` share slug. Optionally bulk-inserts locations. Returns `{ slug, id }`.

### GET /api/resolve-url?url=...

Follows short URL redirects (e.g., `maps.app.goo.gl/...`) server-side and returns the resolved full URL. Used by the location input to support short Google Maps links.

### GET /api/trips/[slug]

Retrieves a trip by share slug with all associated locations via Supabase join.

## Key Components

### MapView / MapInner (`src/components/map-view.tsx`, `map-inner.tsx`)

Interactive Leaflet map loaded client-side via `next/dynamic` (Leaflet requires `window`). Displays blue markers for homestays and red markers for destinations. When a homestay is selected, draws polylines to each destination color-coded by distance (green = close, red = far). Default center: Da Lat, Vietnam.

### LocationInput / LocationList (`src/components/location-input.tsx`, `location-list.tsx`)

Input panels for adding locations. Supports Google Maps URL pasting, CSV/JSON upload, and manual coordinate entry. LocationList renders added locations with remove actions. Both accept a `type` prop (`"homestay"` or `"destination"`).

### RankingList (`src/components/ranking-list.tsx`)

Displays homestays ranked by weighted average distance to all destinations. Priority stars on destinations affect the weighting.

### DistanceMatrix (`src/components/distance-matrix.tsx`)

Pairwise distance table between homestays and destinations. Each cell shows straight-line distance and contains a DrivingTimeButton.

### DrivingTimeButton (`src/components/driving-time-button.tsx`)

Button rendered inside each distance matrix cell. Fetches driving distance and duration from `/api/directions` on click and displays inline (e.g., "12.3 km / 18 min").

### ShareExport (`src/components/share-export.tsx`)

Share button saves the trip via `POST /api/trips` and copies the read-only URL (`/trip/[slug]/share`) to clipboard. Export button downloads trip data as `.json`.

### PriorityStars (`src/components/priority-stars.tsx`)

Star rating input for setting destination priority (1-5), used in the location list.

## State Management

Zustand store at `src/store/trip-store.ts` (`useTripStore`).

| Field             | Type              | Description                         |
|-------------------|-------------------|-------------------------------------|
| tripName          | string            | Current trip name                   |
| locations         | Location[]        | All homestays and destinations      |
| selectedHomestayId| string or null    | Currently selected homestay for map |

Actions: `setTripName`, `addLocation`, `removeLocation`, `updatePriority`, `setSelectedHomestay`, `reset`.

Components read from the store and filter by `type` to get homestays or destinations.

## Utility Libraries

### Parsers (`src/lib/parsers.ts`)

- `parseGoogleMapsUrl(url)` -- Extracts lat/lon/name from Google Maps URLs.
- `parseCsvLocations(csv)` -- Parses CSV with `name,lat,lon` columns.
- `parseJsonLocations(json)` -- Parses JSON array of location objects.

### Distance (`src/lib/distance.ts`)

Haversine formula for straight-line distance between two coordinates.

### Ranking (`src/lib/ranking.ts`)

Computes weighted average distance from each homestay to all destinations, using destination priority as weights. Returns sorted `RankedHomestay[]`.

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

### New API Routes

#### GET /api/auth/callback

Handles the OAuth redirect from Supabase Auth. Exchanges the authorization code for a session and sets session cookies.

#### GET/POST/DELETE /api/saved-trips

Manages saved trips for the authenticated user. `GET` returns all saved trips, `POST` saves a trip by ID, `DELETE` removes a saved trip.
