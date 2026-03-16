# Real Driving Distances Design

## Problem

The app ranks homestays using haversine (straight-line) distance, which is inaccurate for real-world scenarios — especially in Vietnam with winding roads, one-way streets, and waterways. OSRM driving distances exist but are only fetched on-demand per cell click.

## Decision

Replace haversine-based ranking with real OSRM driving distances. Use haversine as an instant fallback while driving distances load.

## Approach: Hybrid Table API + On-Demand Routes

- Use OSRM Table API (`/table/v1/`) to fetch all NxM distances in a single request for ranking and display.
- Fetch individual routes (`/route/v1/`) on-demand when a user selects a homestay, for polyline geometry on the map.
- Separate distance store (Zustand) to manage driving distance state independently from trip store.

## Components

### 1. OSRM Table API Route

`GET /api/distances?sources=lat,lon;lat,lon&destinations=lat,lon;lat,lon`

- Parses sources (homestays) and destinations
- Calls OSRM: `/table/v1/driving/{coords}?sources=...&destinations=...&annotations=distance,duration`
- Returns NxM matrix of `{ distanceKm, durationMinutes }` (or `null` if no route)

### 2. Distance Store

`src/store/distance-store.ts` — Zustand store.

```typescript
interface DrivingDistance {
  drivingKm: number;
  drivingMinutes: number;
}

interface DistanceState {
  distances: Map<string, DrivingDistance>;  // key: "homestayId:destinationId"
  loading: boolean;
  error: string | null;
  fetchDistances(homestays: Location[], destinations: Location[]): Promise<void>;
  clear(): void;
}
```

### 3. Auto-Fetch Hook

`useAutoFetchDistances()` — watches trip store locations, debounces 300ms, calls `fetchDistances`.

### 4. Ranking Integration

`rankHomestays` gains optional `drivingDistances` parameter. Uses driving km when available, haversine as fallback.

`RankedHomestay.distances` entries gain optional `drivingKm` and `drivingMinutes` fields.

### 5. UI Changes

- **Distance matrix:** Shows driving distance as primary, haversine as fallback while loading. Remove `DrivingTimeButton`.
- **Ranking list:** Uses driving-based weighted avg. Shows loading indicator while fetching.
- **Map polylines:** Color gradient uses driving distances. Route geometry fetched on-demand per selected homestay.

**Loading UX:** Muted haversine value + small spinner → replaced with driving distance when ready.

## Data Flow

```
Locations change → useAutoFetchDistances (debounced)
  → /api/distances → OSRM table API (1 request)
  → distance-store populated
  → rankHomestays uses driving distances
  → UI updates (matrix, ranking, map colors)

User selects homestay → /api/directions per destination (on-demand)
  → polylines drawn on map
```

## What Gets Deleted

- `DrivingTimeButton` component

## What Stays Unchanged

- Trip store, location CRUD, geocoding
- Haversine utility (kept as fallback)
- `/api/directions` route (used for polyline geometry)

## Scale

Target: ~5-10 homestays x 5-10 destinations (~100 pairs). Single OSRM table API call handles this.
