# Feature: Map Style Switcher

## Branch: `feature/map-style-switcher`
## Batch: A (parallel-safe)
## Effort: Very Low (~2 hours)

## Problem
Users can only see the default OpenStreetMap tile style. Satellite view is genuinely useful for evaluating homestay surroundings (roads, proximity to beach, terrain). Dark mode map matches the app's dark theme.

## Solution
Add a floating control on the map that lets users switch between tile styles.

## Tile Styles

### Leaflet (OSM)
| Style | Tile URL | Notes |
|-------|----------|-------|
| Default | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | Current |
| Satellite | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Esri free tier |
| Terrain | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` | Topographic |
| Dark | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | CartoDB dark |

### Google Maps
Use `mapTypeId` property: `roadmap`, `satellite`, `terrain`, `hybrid`

## Implementation

### Files to Create/Modify
- `src/components/map-style-switcher.tsx` — New floating control component
- `src/components/map-providers/leaflet-map.tsx` — Accept `tileUrl` prop, update tile layer
- `src/components/map-providers/google-map.tsx` — Accept `mapTypeId` prop
- `src/components/map-view.tsx` — Wire switcher to map components

### UI Design
- Floating button group in top-right corner of map
- Icons: `Map`, `Satellite`, `Mountain`, `Moon` from lucide-react
- Small pill buttons, semi-transparent background
- Persist selection in localStorage

### State
- Local state in `MapView` component (no store needed)
- Save preference to `localStorage` key `map-style`

## Acceptance Criteria
- [ ] User can switch between 4 map styles on Leaflet
- [ ] Google Maps respects mapTypeId when available
- [ ] Selection persists across page reloads
- [ ] Control doesn't overlap with zoom controls
- [ ] Responsive — works on mobile (smaller buttons)
- [ ] respects `prefers-reduced-motion` for any transitions
