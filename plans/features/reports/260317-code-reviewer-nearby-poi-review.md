# Code Review: Nearby POI Layer (feature/nearby-poi)

**Date:** 2026-03-17
**Branch:** `feature/nearby-poi`
**Reviewer:** code-reviewer agent

---

## Code Review Summary

### Scope
- Files reviewed: `src/app/api/nearby/route.ts`, `src/lib/overpass.ts`, `src/components/nearby-poi.tsx`, `src/components/map-providers/leaflet-map.tsx`, `src/components/map-providers/google-map.tsx`, `src/components/map-view.tsx`
- Lines of code analyzed: ~519 added
- Review focus: acceptance criteria, Overpass query correctness, rate limiting, cache TTL, XSS, map marker rendering, mobile responsiveness, error handling
- Updated plans: `plans/features/06-nearby-poi.md`

### Overall Assessment

Implementation is solid and well-structured. All 5 POI categories are present, both map providers render markers correctly, XSS is not a concern (React escapes text nodes), and the cache TTL (5 min) is reasonable. Two issues require fixes before merge: the rate-limiter does NOT enforce the required 2-second gap (only serializes, no delay), and the `pending` promise chain permanently breaks when Overpass returns an error, causing all subsequent requests to silently fail for the remainder of the server process lifetime.

---

### Critical Issues

**None** (no data loss, no security vulnerability, no breaking deploy)

---

### High Priority Findings

**1. Rate limiter does not enforce 2-second gap between Overpass requests**

The spec requires "max 1 request per 2 seconds (Overpass policy)". The current mutex only serializes requests — if the Overpass query completes in 300ms, the next one fires immediately. Under burst traffic (e.g. multiple users toggling categories simultaneously), requests can hit Overpass at full speed and trigger HTTP 429 / temporary bans.

Fix — add a minimum delay after each request:

```ts
const RATE_LIMIT_MS = 2000;
let lastRequestTime = 0;

async function queryOverpassRateLimited(...args) {
  const now = Date.now();
  const wait = Math.max(0, RATE_LIMIT_MS - (now - lastRequestTime));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return queryOverpass(...args);
}
```

Replace the `pending.then(() => queryOverpass(...))` call with `pending.then(() => queryOverpassRateLimited(...))`.

**2. Failed Overpass request permanently breaks the `pending` chain**

The current code:
```ts
pending = pending.then(() => queryOverpass(...))
```

If `queryOverpass` throws (Overpass 429, timeout, network error), the rejection propagates through `pending`. Every subsequent request that chains off `pending` also rejects immediately, and the outer `catch` never reassigns `pending` to a resolved state. The chain is permanently broken for the server process lifetime (until the Next.js worker restarts).

Verified with Node.js simulation: a single failure causes all subsequent requests to be dropped.

Fix:
```ts
const result = await (pending = pending
  .catch(() => {})  // recover chain on error
  .then(() => queryOverpass(lat, lon, radius, categories))
);
```

Or reset `pending` in the catch block of the route handler.

---

### Medium Priority Improvements

**3. Overpass query only fetches `node` elements — misses large POIs mapped as `way` or `relation`**

`buildOverpassQuery` emits `node(around:...)[tag]` only. In OSM, many hospitals, supermarkets, and banks are mapped as `way` or `relation` (the building/area), not as a `node`. These are completely invisible in results.

Fix — use `nwr` (node/way/relation) union and add `out center;` to get a center coordinate for ways:

```
[out:json][timeout:10];
(
  node(around:${radius},${lat},${lon})[amenity~"restaurant|cafe"];
  way(around:${radius},${lat},${lon})[amenity~"restaurant|cafe"];
  relation(around:${radius},${lat},${lon})[amenity~"restaurant|cafe"];
);
out center;
```

Then in `route.ts`, handle `el.center` (for ways/relations) falling back to `el.lat/el.lon` (for nodes):
```ts
const elLat = el.center?.lat ?? el.lat;
const elLon = el.center?.lon ?? el.lon;
```

**4. `enabledCategories` state cleared when homestay changes, but categories remain visually active**

`useEffect` in `nearby-poi.tsx` clears `pois` and calls `onPoisChange([])` on homestay change, but does NOT reset `enabledCategories`. The UI shows buttons as active (highlighted) but no markers are displayed — confusing UX. User must re-toggle to reload.

Fix: add `setEnabledCategories(new Set())` in the homestay-change effect.

**5. `prevHomestayIdRef` pattern is unnecessary**

The `useEffect` compares `prevHomestayIdRef.current !== selectedHomestayId` then updates the ref. This is equivalent to just running the effect when `selectedHomestayId` changes — React's dependency array handles this. The ref adds complexity without benefit.

Fix: remove the ref and the conditional, just run cleanup directly:
```ts
useEffect(() => {
  setPois([]);
  onPoisChange([]);
  setError(null);
  setEnabledCategories(new Set());
}, [selectedHomestayId]); // onPoisChange intentionally excluded (stable callback)
```

**6. No debounce on radius slider**

`handleRadiusChange` fires a fetch on every `input` event as the slider moves. At step=100 this means potentially 15 sequential API calls for a full sweep. With the mutex, these queue up and hammered Overpass after the cache gets populated.

Fix: debounce the fetch by 300ms inside `handleRadiusChange`, similar to other debounce patterns already in the codebase.

---

### Low Priority Suggestions

**7. POI key uses array index (`poi-${i}-...`)**

`pois.map((poi, i) => <PoiMarker key={`poi-${i}-${poi.lat}-${poi.lon}`} />)` — using index as part of the key is fine here since the array is replaced wholesale on each fetch, but `poi.lat-poi.lon-poi.category` alone would be more stable (two restaurants at the same lat/lon are unlikely).

**8. `w-56` panel width may clip on small phones**

`w-56` = 224px. On 320px-wide screens (iPhone SE), this leaves only 96px from the left edge before it hits the right side of the screen with 12px left padding. Not technically broken, but `max-w-[calc(100vw-24px)]` would be safer.

**9. Overpass `timeout:10` may be too short for large radii**

At radius=2000m in a dense city, node count can be high. The Overpass default is 25s; 10s may produce partial results without an error response (the API returns whatever was processed). Consider `timeout:25`.

**10. In-memory cache is per-worker and not shared**

Noted in architecture docs as "in-memory cache". Under Next.js with multiple workers (production PM2/Kubernetes), each worker has its own cache, leading to redundant Overpass queries. Acceptable for now given "Redis if available" note in spec, but worth flagging for scale.

---

### Positive Observations

- XSS is not a concern — `poi.name` is inserted as a React text child (`<strong>{poi.name}</strong>`), which React escapes automatically. No `dangerouslySetInnerHTML`.
- Both Leaflet (`CircleMarker`) and Google Maps (`AdvancedMarker` + colored `div`) render POI markers correctly with category colors.
- Cache eviction on `size > 100` is a sensible guard against unbounded growth.
- `classifyElement` is clean and correctly matches the Overpass query tags.
- Haversine implementation is correct.
- Input validation in the API route (isNaN, radius clamp, category allowlist) is solid — no injection possible into the Overpass query since category values are strictly checked against `allCategories`.
- Local-only state (no Zustand store) is correct per spec.
- Loading spinner and error message are implemented.

---

### Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| POIs load for selected homestay within chosen radius | PASS |
| 5 POI categories with distinct icons and colors | PASS |
| Radius adjustable 500m–2km | PASS |
| Toggle on/off per category | PASS |
| Click POI shows name and distance | PASS |
| Respects Overpass rate limits | FAIL — serialized but no 2s gap enforced |
| Works on both Leaflet and Google Maps | PASS |
| Loading state while fetching | PASS |
| Graceful error handling if Overpass is down | PARTIAL — broken chain (issue #2) means second error onward silently fails |

---

### Recommended Actions

1. **[High]** Fix broken `pending` chain on error — add `.catch(() => {})` recovery before chaining next request
2. **[High]** Add 2-second minimum gap to rate limiter to comply with Overpass policy
3. **[Medium]** Reset `enabledCategories` on homestay change (issue #4)
4. **[Medium]** Remove `prevHomestayIdRef` redundancy (issue #5)
5. **[Medium]** Add `nwr` + `out center` to Overpass query to catch way/relation POIs (issue #3)
6. **[Medium]** Debounce radius slider (issue #6)
7. **[Low]** Mobile panel max-width guard (issue #8)
