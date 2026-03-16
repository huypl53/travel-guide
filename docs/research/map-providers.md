# Map Provider Research for Vietnam

## Google Maps Platform (Paid, $200/mo free tier)

- Best Vietnamese address geocoding and POI coverage
- Street View available in Vietnam
- Superior for: address search, routing with traffic, business/POI search

### APIs

| API | Purpose |
|-----|---------|
| Maps JavaScript API | Embed interactive maps in web pages |
| Maps Static API | Embed map images (no JS needed) |
| Maps Embed API | iframe-based embedding |
| Directions API | Routing between locations |
| Distance Matrix API | Travel time/distance for multiple origins/destinations |
| Roads API | Snap GPS coordinates to roads |
| Places API | Search for places, get details, autocomplete |
| Geocoding API | Convert addresses to/from coordinates |
| Elevation API | Elevation data for locations |

### Setup

1. Create a project in Google Cloud Console
2. Enable the specific Maps APIs needed
3. Get an API key

## Free / Open-Source Options

### OpenStreetMap (OSM)

- Best free option for Vietnam
- Active local mapping community
- Good street-level data in major cities (HCMC, Hanoi, Da Nang)
- Rural areas are decent but less detailed than Google
- Vietnamese street names and POIs available
- No usage limits on the data itself

### Leaflet.js

- Open-source JS library for interactive maps
- Commonly paired with OSM tiles
- Great for displaying maps with markers/pins
- No API key needed for basic usage

### MapLibre

- Open-source fork of Mapbox GL JS
- WebGL-based, supports vector tiles
- More performant for large datasets

### Nominatim

- Free geocoding service built on OSM data
- Works for Vietnam but less reliable than Google for Vietnamese addresses
- Vietnamese address formats can be inconsistent

### OSRM / Valhalla

- Free open-source routing engines built on OSM data
- Good routing quality but no real-time traffic data

### Tile Providers (free tiers)

- **Stadia Maps** — free tier available
- **Maptiler** — free tier with reasonable limits
- Self-hosted tiles — fully free but requires server setup

## Other Paid Alternatives

| Service | Notes |
|---------|-------|
| Mapbox | Popular, generous free tier, very customizable |
| HERE Maps | Enterprise-focused, good free tier |
| Apple MapKit JS | Apple's web maps API |

## Vietnam Coverage Comparison

| Feature | Free (OSM-based) | Google Maps |
|---------|-------------------|-------------|
| Map display | Good | Excellent |
| Vietnamese POIs | Moderate | Extensive |
| Geocoding | Nominatim (decent) | Superior for VN addresses |
| Directions/Routing | OSRM/Valhalla (good) | Better traffic data |
| Street View | No | Yes (good VN coverage) |
| Places search | Limited | Much better for VN businesses |

## Recommendations

- **Map display + markers only:** Leaflet + OSM is sufficient
- **Vietnamese address geocoding:** Google is noticeably better
- **Directions with traffic:** Google or Mapbox preferred
