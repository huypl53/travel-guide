# Research: Google Maps URL Formats for Multi-Location Import

**Date:** 2026-03-18 | **Researcher:** researcher-01

---

## 1. Directions URLs (Multiple Waypoints)

### Format
```
https://www.google.com/maps/dir/?api=1&origin=START&waypoints=STOP1|STOP2|STOP3&destination=END
```

### Key Constraints
- **Separator:** Pipe character (`|`) separates waypoints
- **Limit:** Max 9 waypoints (3 on mobile)
- **Location spec:** Place name, address, or `lat,lon` coordinates
- **URL length:** 2,048 chars max per request
- **Encoding:** Spaces as `%20` or `+`; commas as-is

### Regex for Coordinate Extraction
```regex
/@([-0-9]+\.[0-9]+),([-0-9]+\.[0-9]+),/
```
Extracts latitude/longitude from place URLs like:
```
https://www.google.com/maps/place/Empire+State+Building/@40.7484405,-73.9856644,17z/
```

### Practical Example
```
https://www.google.com/maps/dir/?api=1&origin=Berlin,Germany&waypoints=Paris,France|Lyon,France&destination=Zurich,Switzerland
```

---

## 2. Shared Lists/Collections

### Current State
- Google Maps collections support sharing via shareable links
- No standardized public URL format documented in official API
- Community reports mention `/maps/placelists/list/...` or `/maps/@.../data=...` patterns
- Share permission options: view-only or editable

### URL Patterns (Inferred)
**Placelists structure:**
```
https://www.google.com/maps/placelists/list/[LIST_ID]
```
or nested under user profile:
```
https://www.google.com/maps/@[LAT],[LON],z/data=[ENCODED_DATA]
```

### Reality Check
- **No official API:** Google does not provide developer docs for placelists URLs
- **Not easily parseable:** Requires HTML scraping or Google Maps API integration
- **Third-party scrapers exist:** Apify, GitHub gists document reverse-engineered extraction

---

## 3. Short URL Resolution

### Format
**Current:** `https://goo.gl/maps/[HASH]` (legacy goo.gl service)
**Modern:** `https://maps.app.goo.gl/[HASH]` (Firebase Dynamic Links replacement)

### Resolution Behavior
- Short links **expand to full directions or place URLs**
- Expansion can yield:
  - Directions with multiple waypoints
  - Single place detail URLs
  - Saved list/collection URLs
- **Third-party resolvers:** Google Maps Unshortener can expand links programmatically

### Deprecation Note
- Google URL Shortener (goo.gl) **discontinued 2025-08-25** except for goo.gl links from Google apps
- `maps.app.goo.gl` links remain functional as Firebase Dynamic Links

---

## 4. Data Embedded in HTML

### Script Tag Patterns
Modern Google Maps pages embed data in `<script>` tags within the HTML:

**Pattern 1: GeoJSON in script**
```html
<script type="application/json">
  {"type":"FeatureCollection","features":[...]}
</script>
```

**Pattern 2: Callback-loaded via Maps API**
```html
<script>
  function initMap() { /* GeoJSON loaded and applied */ }
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=API_KEY&callback=initMap"></script>
```

### Data Format
- **GeoJSON standard** for feature collections with location metadata
- Features contain: point geometry (lat/lon), place name, opening hours, phone, etc.
- Loaded as external JSON file or inline object

### Reality Check
- **No standardized data structure** in HTML for placelists/saved places
- Directions URLs don't embed data—they're just routing instructions
- Scraping would require reverse-engineering post-load DOM or using Puppeteer/Playwright

---

## 5. Practical Extraction Approaches

| Source | Parseable from URL | Requires Scraping | Notes |
|--------|-------------------|-------------------|-------|
| **Directions (multi-waypoint)** | ✅ Full | ❌ No | Regex + URL parsing sufficient |
| **Shared lists/collections** | ⚠️ Partial | ✅ Yes | ID extractable; locations require page load |
| **Short URLs (maps.app.goo.gl)** | ⚠️ Partial | ✅ Yes | Resolve to full URL first, then parse |
| **Embedded GeoJSON (search/explore)** | ❌ No | ✅ Yes | Only available post-JavaScript execution |

### Recommended Approach by Use Case

1. **Directions with waypoints:** Use regex on URL directly
   ```js
   const urlPattern = /\/maps\/dir\//;
   if (urlPattern.test(url)) { /* parse origin, waypoints, destination */ }
   ```

2. **Shared lists:** Require Playwright/Puppeteer to load and extract DOM
   - Inspect rendered markers
   - Parse network requests to Places API

3. **Short URL expansion:** Use HEAD request to resolve location
   ```js
   fetch(shortUrl, {method:'HEAD'}) // follows redirects
   ```

---

## 6. URL Parameter Reference (Official)

From Google Maps API docs:

| Parameter | Purpose | Format |
|-----------|---------|--------|
| `api=1` | Required for all URLs | `api=1` |
| `origin` | Starting point (directions) | Address or `lat,lon` |
| `destination` | End point (directions) | Address or `lat,lon` |
| `waypoints` | Intermediate stops (directions) | `place1\|place2\|place3` |
| `query` | Search term (search URLs) | Text |
| `center` | Map center | `lat,lon` |
| `zoom` | Zoom level | Integer (1-21) |

---

## 7. Unresolved Questions

1. **Placelists URL structure:** Does Google publish official documentation?
2. **Data extraction limit:** Are there rate limits when batch-importing locations?
3. **Authentication:** Can shared list URLs be parsed without auth, or are they view-only?
4. **Map state persistence:** How long do short URLs remain valid after generation?

---

## Sources

- [Get Started | Maps URLs | Google for Developers](https://developers.google.com/maps/documentation/urls/get-started)
- [Direct Users to Google Maps Places Details and Directions with Maps URL | Google Maps Platform](https://developers.google.com/maps/architecture/maps-url)
- [Directions API Documentation | Google for Developers](https://developers.google.com/maps/documentation/directions/get-directions)
- [Google Maps iOS URL Scheme](https://developers.google.com/maps/documentation/urls/ios-urlscheme)
- [Google Maps Unshortener](https://mapu.retiolus.net/)
- [How to Extract Google Maps Coordinates | KDnuggets](https://www.kdnuggets.com/2019/11/octoparse-extract-google-maps-coordinates.html)
- [Import GeoJSON Data into Maps | Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/importing_data)
- [Google Maps Shared List Scraper | Apify](https://apify.com/parseforge/google-maps-shared-list-scraper)
