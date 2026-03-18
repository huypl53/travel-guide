# Feature: What's Nearby POI Layer

## Branch: `feature/nearby-poi`
## Batch: D (parallel-safe — independent API)
## Effort: Medium (~4 hours)

## Problem
Users pick a homestay based on distance to destinations, but they also care about practical amenities: "Is there a convenience store nearby? Restaurants? ATM?" This info isn't visible on the current map.

## Solution
Query OpenStreetMap's Overpass API for POIs around a selected homestay and display them as a toggleable map layer.

## POI Categories

| Category | OSM Tags | Icon (lucide) | Color |
|----------|----------|---------------|-------|
| Restaurant | `amenity=restaurant\|cafe\|fast_food` | `UtensilsCrossed` | orange |
| Store | `shop=convenience\|supermarket` | `ShoppingBag` | blue |
| ATM/Bank | `amenity=atm\|bank` | `Banknote` | green |
| Gas Station | `amenity=fuel` | `Fuel` | red |
| Hospital/Clinic | `amenity=hospital\|clinic\|pharmacy` | `Heart` | pink |

## Implementation

### API Route
```
GET /api/nearby?lat=X&lon=Y&radius=1000&categories=restaurant,store,atm
```

- Calls Overpass API: `[out:json];node(around:{radius},{lat},{lon})[amenity~"restaurant|cafe"];out body;`
- Returns: `{ category, name, lat, lon, distance }[]`
- Cache results in memory (or Redis if available) — POI data doesn't change often
- Rate limit: max 1 request per 2 seconds (Overpass policy)

### Files to Create
- `src/app/api/nearby/route.ts` — Overpass API proxy with caching
- `src/components/nearby-poi.tsx` — POI toggle panel + map layer control
- `src/lib/overpass.ts` — Overpass query builder utility

### Files to Modify
- `src/components/map-providers/leaflet-map.tsx` — Render POI markers as a separate layer
- `src/components/map-providers/google-map.tsx` — Render POI markers
- `src/components/map-view.tsx` — Wire POI layer toggle
- `src/app/trip/[slug]/page.tsx` — Add POI controls

### UI Design
- Floating panel on map (or sidebar section): category checkboxes with icons
- Radius slider: 500m — 2km (default 1km)
- POI markers: smaller than homestay/destination markers, category-colored circles
- Click POI marker: show name + distance from selected homestay
- "Show nearby" button appears when a homestay is selected

### State
- Local state in map component (no store — ephemeral data)
- Fetch on demand when user toggles category or changes radius
- Clear when selected homestay changes

## Acceptance Criteria
- [x] POIs load for selected homestay within chosen radius
- [x] 5 POI categories with distinct icons and colors
- [x] Radius adjustable (500m — 2km)
- [x] POI markers don't clutter — toggle on/off per category
- [x] Click POI shows name and distance
- [ ] Respects Overpass rate limits — **FAIL**: mutex serializes but no 2s gap enforced; fix pending chain break on error
- [x] Works on both Leaflet and Google Maps
- [x] Loading state while fetching
- [ ] Graceful error handling if Overpass is down — **PARTIAL**: first error caught, but broken `pending` chain silently drops all subsequent requests

## Code Review Status
**Reviewed:** 2026-03-17 — see `plans/features/reports/260317-code-reviewer-nearby-poi-review.md`

### Blocking Issues (must fix before merge)
1. `pending` chain permanently broken on first Overpass error — add `.catch(() => {})` recovery
2. Rate limiter does not enforce 2s gap — add minimum delay after each Overpass request

### Non-blocking (fix before or after merge)
3. Overpass query fetches `node` only — misses hospitals/supermarkets mapped as `way`/`relation`
4. `enabledCategories` not reset when selected homestay changes — stale active UI state
5. `prevHomestayIdRef` pattern is redundant — simplify to plain effect
6. Radius slider not debounced — fires fetch on every tick
