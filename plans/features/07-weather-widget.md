# Feature: Weather Widget

## Branch: `feature/weather-widget`
## Batch: D (parallel-safe — independent API)
## Effort: Low (~2-3 hours)

## Problem
Travelers care about weather when planning trips. Currently they have to check a separate weather app/site. Showing forecast inline reduces context-switching.

## Solution
Display a compact 5-day weather forecast for the trip's region using Open-Meteo API (free, no API key required).

## API

### Open-Meteo (free, no key)
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Asia/Ho_Chi_Minh&forecast_days=5
```

Returns daily max/min temp, precipitation, and WMO weather codes (0=clear, 1-3=cloudy, 51-67=rain, 71-77=snow, 95-99=thunderstorm).

### Server Proxy
```
GET /api/weather?lat=X&lon=Y
```
- Proxy through Next.js API route to avoid CORS and add caching
- Cache response for 1 hour (weather doesn't change minute-to-minute)
- Use trip center point as location

## Implementation

### Files to Create
- `src/app/api/weather/route.ts` — Open-Meteo proxy with caching
- `src/components/weather-widget.tsx` — Compact forecast display
- `src/lib/weather-codes.ts` — WMO code → icon/label mapping

### Files to Modify
- `src/app/trip/[slug]/page.tsx` — Add weather widget to trip page header area

### WMO Weather Code Mapping
```typescript
// Map WMO codes to lucide icons + labels
const weatherMap: Record<number, { icon: string; label: string }> = {
  0: { icon: "Sun", label: "Clear" },
  1: { icon: "Sun", label: "Mostly Clear" },
  2: { icon: "Cloud", label: "Partly Cloudy" },
  3: { icon: "Cloud", label: "Overcast" },
  51: { icon: "CloudDrizzle", label: "Light Drizzle" },
  61: { icon: "CloudRain", label: "Rain" },
  95: { icon: "CloudLightning", label: "Thunderstorm" },
  // ... etc
};
```

### UI Design
- Compact horizontal strip (fits in trip page header or above map)
- 5 day cards in a row: day name, weather icon, high/low temp
- Highlight rainy days with subtle blue background
- Collapsible on mobile (show current day + expand for 5-day)
- Temperature in Celsius (default for Vietnam/international visitors)

### State
- Fetch once on trip page load using trip center coordinates
- useSWR or simple useState + useEffect with 1-hour cache
- No Zustand store needed — component-local

## Acceptance Criteria
- [x] 5-day forecast displays on trip page
- [x] Weather icons match conditions (sun, cloud, rain, storm)
- [x] High/low temperature shown per day
- [x] Rainy days visually highlighted
- [x] Loads from trip center coordinates automatically
- [x] Cached for 1 hour (no excessive API calls) — NOTE: in-memory cache only; silently no-ops on serverless cold starts
- [x] Graceful fallback if API unavailable (widget hidden on error)
- [x] Responsive — compact on mobile (collapsible)
- [x] No API key required

## Review Status
Code review completed 2026-03-17. Issues found — see `plans/features/reports/260317-code-review-weather-widget.md`.

### Blocking before merge
- Mobile expanded view missing `overflow-x-auto` (cards overflow viewport on narrow screens)
- `CloudOff` imported and rendered (hidden) but never actually shown — dead import

### Non-blocking
- In-memory cache is a no-op on Vercel/serverless (medium concern)
- No `aria-expanded` / `aria-label` on expand button
- No lat/lon range validation in API route (allows impossible coords through to upstream)
