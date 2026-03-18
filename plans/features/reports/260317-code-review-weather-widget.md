# Code Review: Weather Widget

**Date:** 2026-03-17
**Branch:** `feature/weather-widget`
**Reviewer:** code-review agent
**Plan:** `plans/features/07-weather-widget.md`

---

## Code Review Summary

### Scope
- Files reviewed: `src/app/api/weather/route.ts`, `src/components/weather-widget.tsx`, `src/lib/weather-codes.ts`, `src/app/trip/[slug]/page.tsx` (diff only), `README.md`, `docs/architecture.md`
- Lines of code analyzed: ~320 new lines
- Review focus: recent changes (feature branch diff vs master)
- Updated plans: `plans/features/07-weather-widget.md`

### Overall Assessment
Implementation is solid and well-structured. All acceptance criteria are functionally met. TypeScript compiles clean. Two issues need fixing before merge — both are small.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — Mobile expanded view clips without scroll (`weather-widget.tsx:147`)
When expanded on mobile, the 5 extra `DayCard` elements render inside `div.flex.items-center.gap-2` (line 147) with **no** `overflow-x-auto`. On a 375px screen, 5 cards × ~72px = ~360px + button — will either wrap awkwardly or overflow the card boundary.

**Fix:** Add `overflow-x-auto` to the mobile flex wrapper.
```tsx
<div className="flex items-center gap-2 overflow-x-auto">
```

---

## Medium Priority Improvements

### M1 — In-memory cache is a no-op on serverless (`route.ts:8-11`)
`const cache = new Map<string, CacheEntry>()` lives at module scope. On Vercel (serverless), every cold start gets a fresh module — the cache never persists across requests in practice. The plan says "cached for 1 hour" but that guarantee only holds on a self-hosted long-running Node.js process.

**Options (pick one):**
1. Use Next.js native fetch caching: `fetch(url, { next: { revalidate: 3600 } })` — works correctly on all deployment targets including Vercel.
2. Add HTTP `Cache-Control` header on the response so a CDN/edge caches it.
3. Keep as-is and document the limitation (cache is best-effort).

Option 1 is one-line and is the idiomatic Next.js 14+ approach.

### M2 — No lat/lon range validation (`route.ts:22-30`)
`parseFloat` accepts values like `lat=9999`. These pass through to Open-Meteo which returns a 400. The proxy already handles non-200 responses with a 502, so no breakage — but passing `lat=-91` or `lat=abc123` should be rejected early.

**Fix:** Add bounds check after `isNaN` guard:
```ts
if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
  return NextResponse.json({ error: "lat/lon out of range" }, { status: 400 });
}
```

---

## Low Priority Suggestions

### L1 — Dead import and hidden element (`weather-widget.tsx:4,139`)
`CloudOff` is imported and rendered with `className="... hidden"` inside the desktop view (line 139). The element is never made visible — it's dead code left from a draft. Remove both the import and the element.

### L2 — Missing accessibility attributes on expand button (`weather-widget.tsx:153-167`)
The expand/collapse button has no `aria-label` or `aria-expanded`. Screen readers announce it as a generic button.

**Fix:**
```tsx
<Button
  variant="ghost"
  size="sm"
  className="ml-auto shrink-0"
  aria-expanded={expanded}
  aria-label={expanded ? "Collapse forecast" : "Show 5-day forecast"}
  onClick={() => setExpanded(!expanded)}
>
```

### L3 — `isToday` assumes API returns today as index 0
`isToday={i === 0}` is correct given Open-Meteo always returns current day first, but this is an implicit contract with no comment. Low risk given the API is stable.

### L4 — Timezone mismatch for `dayName` (`weather-widget.tsx:42`)
`new Date(date + "T00:00:00")` creates a local-time Date. If a user's browser is in UTC-X, the date could shift back one day for early-morning visits. The API returns dates in `Asia/Ho_Chi_Minh` timezone. Using `"T00:00:00+07:00"` instead would be robust:
```ts
const d = new Date(date + "T00:00:00+07:00");
```

---

## Positive Observations
- Cancellation pattern in `useEffect` (`cancelled` flag) is correct — no stale state on fast navigation.
- `useEffect` deps `[center?.lat, center?.lon]` use primitives, preventing unnecessary re-fetches on each render even though `weatherCenter` is a new object reference per render. Correct.
- WMO weather code coverage is complete (28 codes covering all documented WMO ranges including fog codes 45/48 which the plan spec omitted).
- `AbortSignal.timeout(10000)` on the upstream fetch — good defensive practice.
- Cache eviction on `size > 100` prevents unbounded growth.
- Widget silently hides on error — correct UX, no broken state shown to user.
- Skeleton loading cards match the real card layout — no layout shift.
- TypeScript compiles with zero errors.

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|---|---|---|
| 5-day forecast on trip page | PASS | |
| Icons match conditions | PASS | Full WMO coverage |
| High/low temp per day | PASS | |
| Rainy days highlighted | PASS | `bg-blue-500/10` |
| Trip center coords | PASS | `useMemo` in page |
| Cached 1 hour | PARTIAL | Works on long-running server; no-op on serverless cold start |
| Graceful fallback | PASS | Hidden on error/no locations |
| Responsive/mobile | PARTIAL | Mobile expanded view may overflow (H1) |
| No API key | PASS | |

---

## Recommended Actions
1. **Fix H1** — Add `overflow-x-auto` to mobile expanded flex container.
2. **Fix L1** — Remove dead `CloudOff` import and hidden element.
3. **Fix L2** — Add `aria-expanded` + `aria-label` to expand button.
4. **Consider M1** — Switch to `fetch(url, { next: { revalidate: 3600 } })` for reliable caching on all deployment targets.
5. **Consider L4** — Use `+07:00` suffix in Date constructor to pin timezone for `dayName`.

---

## Metrics
- Type Coverage: 100% (no `any`, clean tsc)
- Test Coverage: 0% (no tests added — consistent with project pattern)
- Linting Issues: 0 (tsc clean)
- Blocking issues: 2 (H1, L1 — dead code is minor but the overflow is a real UX defect)
