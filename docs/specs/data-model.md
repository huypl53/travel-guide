# Data Model & State Management

## Database Schema (Supabase PostgreSQL)

### trips

| Column       | Type         | Constraints                    |
|--------------|--------------|--------------------------------|
| `id`         | uuid         | PK, default: gen_random_uuid() |
| `name`       | text         |                                |
| `share_slug` | text         | UNIQUE                         |
| `user_id`    | uuid         | FK → auth.users, nullable      |
| `created_at` | timestamptz  | default: now()                 |

### locations

| Column    | Type             | Constraints                          |
|-----------|------------------|--------------------------------------|
| `id`      | uuid             | PK                                   |
| `trip_id` | uuid             | FK → trips (CASCADE DELETE)          |
| `type`    | text             | CHECK: 'homestay' or 'destination'   |
| `name`    | text             |                                      |
| `address` | text             | nullable                             |
| `lat`     | double precision |                                      |
| `lon`     | double precision |                                      |
| `priority`| integer          | CHECK: 1-5, default: 3              |
| `source`  | text             | CHECK: 'manual', 'google_maps', 'csv' |

**Indexes:** `idx_locations_trip` on `trip_id`

### saved_trips

| Column    | Type        | Constraints                    |
|-----------|-------------|--------------------------------|
| `id`      | uuid        | PK                             |
| `user_id` | uuid        | FK → auth.users (CASCADE)      |
| `trip_id` | uuid        | FK → trips (CASCADE)           |
| `saved_at`| timestamptz | default: now()                 |

**Constraints:** UNIQUE (user_id, trip_id)
**Indexes:** `idx_saved_trips_trip_id` on `trip_id`

### distance_cache

| Column            | Type             | Constraints                    |
|-------------------|------------------|--------------------------------|
| `id`              | uuid             | PK                             |
| `trip_id`         | uuid             | FK → trips (CASCADE)           |
| `homestay_id`     | uuid             | FK → locations (CASCADE)       |
| `destination_id`  | uuid             | FK → locations (CASCADE)       |
| `straight_line_km`| double precision |                                |
| `driving_km`      | double precision | nullable                       |
| `driving_minutes` | double precision | nullable                       |

**Constraints:** UNIQUE (homestay_id, destination_id)
**Indexes:** `idx_distance_cache_trip` on `trip_id`

### Row Level Security (RLS)

All tables have RLS enabled:

- **trips:** Anyone can SELECT (public sharing). INSERT/UPDATE/DELETE restricted to `user_id = auth.uid()`.
- **locations:** SELECT open. INSERT/UPDATE/DELETE via trip ownership check.
- **saved_trips:** All ops restricted to `user_id = auth.uid()`.
- **distance_cache:** Inherits from trip ownership.

---

## Client-Side State (Zustand)

### useTripStore (`src/store/trip-store.ts`)

Holds the current trip being edited. All UI components read from here.

```
State:
  tripName: string
  locations: Location[]
  selectedHomestayId: string | null
  focusedLocation: { lat, lon } | null

Actions:
  setTripName(name)
  addLocation(input)          → generates nanoid, adds to locations[]
  removeLocation(id)
  updatePriority(id, priority)
  setSelectedHomestay(id)     → highlights on map, triggers route fetch
  setFocusedLocation(loc)     → triggers map flyTo animation
  reset()                     → clears all state
```

### useDistanceStore (`src/store/distance-store.ts`)

Manages OSRM driving distances and route geometries, separate from trip data.

```
State:
  distances: Map<string, DrivingDistance>      key: "homestayId:destId"
  routes: Map<string, [number, number][]>      decoded polyline points
  loading: boolean                             fetching table distances
  routesLoading: boolean                       fetching route geometries
  error: string | null
  _lastCoordHash: string                       dedup key

Actions:
  fetchDistances(homestays, destinations)
    → GET /api/distances
    → populates distances Map
    → skips if coord hash unchanged

  fetchRoutes(homestay, destinations)
    → GET /api/routes for each uncached pair
    → decodes polyline
    → merges into routes Map at write time (race-safe)

  clear()
    → resets all state
```

**DrivingDistance type:**
```typescript
{ drivingKm: number, drivingMinutes: number }
```

---

## TypeScript Types (`src/lib/types.ts`)

```typescript
type LocationType = "homestay" | "destination"
type LocationSource = "manual" | "google_maps" | "csv"

interface Location {
  id: string
  tripId: string
  type: LocationType
  name: string
  address: string | null
  lat: number
  lon: number
  priority: number        // 1-5, used as weight in ranking
  source: LocationSource
}

interface RankedHomestay {
  homestay: Location
  weightedAvgKm: number   // priority-weighted average distance
  distances: {
    destination: Location
    km: number             // haversine (always present)
    drivingKm?: number     // from OSRM (when available)
    drivingMinutes?: number
  }[]
}

interface Trip {
  id: string
  name: string
  shareSlug: string
  userId: string | null
  createdAt: string
  locations: Location[]
}

interface TripCardData {
  id: string
  name: string
  shareSlug: string
  createdAt: string
  homestayCount: number
  destinationCount: number
  topHomestay: string | null
  isSaved: boolean
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│                                                         │
│  LocationInput ──addLocation()──> useTripStore           │
│                                    │                    │
│                    ┌───────────────┤                    │
│                    │               │                    │
│          useAutoSave(2s)    useAutoFetchDistances(300ms) │
│                    │               │                    │
│                    ▼               ▼                    │
│            POST/DELETE      GET /api/distances           │
│           /api/trips              │                     │
│                │                  ▼                     │
│                │           useDistanceStore              │
│                │           ┌──────┴──────┐              │
│                │           │             │              │
│                │     RankingList    DistanceMatrix       │
│                │     (weighted avg) (driving km/min)    │
│                │           │             │              │
│                │           └──────┬──────┘              │
│                │                  │                     │
│                │            MapInner                    │
│                │         (polylines + colors)           │
│                ▼                                        │
│            Supabase                                     │
│         (trips, locations,                              │
│          saved_trips tables)                            │
└─────────────────────────────────────────────────────────┘
```

---

## How Ranking Works (`src/lib/ranking.ts`)

```
rankHomestays(homestays, destinations, drivingDistances?) → RankedHomestay[]

For each homestay:
  For each destination:
    effectiveKm = drivingDistances["hId:dId"]?.drivingKm ?? haversineKm(h, d)
    weighted contribution = effectiveKm × destination.priority

  weightedAvgKm = sum(weighted contributions) / sum(all priorities)

Sort by weightedAvgKm ascending (closest first)
```

Priority ranges 1-5. A destination with priority 5 has 5x the weight of priority 1 in the average.
