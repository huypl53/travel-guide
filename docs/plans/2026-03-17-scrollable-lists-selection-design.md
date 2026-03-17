# Scrollable Lists, Selection & Route Caching

**Date:** 2026-03-17
**Branch:** feature/google-maps-integration

## Features

### 1. Scrollable Lists

LocationList gets a fixed-height scrollable container (~300px / 5-6 items visible) with `overflow-y: auto`. Applies to both homestay and destination list instances. Only activates when items exceed the container height.

### 2. Multi-Select with Visual Dimming

#### Store Changes (Zustand `useTripStore`)

- `selectedHomestayIds: Set<string>` — defaults to all homestay IDs
- `selectedDestinationIds: Set<string>` — defaults to all destination IDs
- `toggleLocationSelection(id)` — toggle single item
- `selectAllByType(type)` / `deselectAllByType(type)` — bulk operations

**Rules:**
- New locations are auto-added to the selected set
- Removed locations are removed from the selected set
- Selection is visual-only — rankings and distances always use all locations
- Default state: everything selected

#### Visual Dimming (consistent `opacity-40` across all components)

| Component | Unselected Behavior |
|-----------|-------------------|
| **LocationList** | `opacity-40`, checkbox/toggle indicator per item |
| **RankingList** | `opacity-40` with subtle blur on unselected homestay rows |
| **DistanceMatrix** | `opacity-40` on unselected homestay rows and destination columns (header + cells) |
| **Map markers** | Reduced opacity on unselected homestay/destination markers |
| **Map routes** | Reduced opacity on unselected homestay routes (not removed, just dimmed) |

#### Controls

- Checkbox toggle per item in LocationList
- Select all / Deselect all buttons at the top of each list section

### 3. Route Fetch Optimization

- Preserve route cache — only clear routes when locations are actually removed, not on every distance recalculation
- Concurrency-limited queue (max 3 concurrent requests) for route API calls to avoid hammering the API when multi-select shows routes for multiple homestays
- Existing cache key logic (`${homestayId}:${destinationId}`) and deduplication remain unchanged

## Components Modified

- `src/store/trip-store.ts` — selection state and actions
- `src/store/distance-store.ts` — route cache preservation, fetch queue
- `src/components/location-list.tsx` — scrollable container, checkboxes, select all/none
- `src/components/ranking-list.tsx` — dimming for unselected rows
- `src/components/distance-matrix.tsx` — dimming for unselected rows/columns
- `src/components/map-providers/leaflet-map.tsx` — marker/route opacity based on selection
- `src/components/map-providers/google-map.tsx` — marker/route opacity based on selection
- `src/app/trip/[slug]/page.tsx` — select all/none buttons in section headers

No new components needed.
