# Code Review: Cost Estimation Feature

**Date:** 2026-03-17
**Branch:** feature/cost-estimation
**Reviewer:** code-reviewer agent

---

## Code Review Summary

### Scope
- Files reviewed: `src/store/cost-store.ts`, `src/components/cost-estimator.tsx`, `src/components/ranking-list.tsx`, `src/app/trip/[slug]/page.tsx`, `docs/architecture.md`, `README.md`
- Lines of code analyzed: ~352 added
- Review focus: feature/cost-estimation diff vs origin/master
- Updated plans: `plans/features/05-cost-estimation.md`

### Overall Assessment
Implementation is clean and well-structured. All acceptance criteria are met. Formula is correct per spec. A few bugs worth fixing before merge, none are critical data-loss issues.

---

### CRITICAL Issues

None.

---

### MEDIUM Issues

**1. Auto-save fires before load completes (race condition)**

`loadFromStorage` is synchronous — it calls `set()` which is also synchronous — so `loadedRef.current` is `true` by the time the save effect runs for the first time. However, the save effect runs on the *same render* that set `loadedRef.current = true`, which means the guard `if (!loadedRef.current) return` **does not work as intended**.

React effects run after paint. Both effects fire after the same render. The load effect runs first (sets `loadedRef.current = true`), then the save effect runs (guard passes). This triggers a no-op save immediately on mount — harmless but indicates the guard is not doing what it claims.

**Real risk:** If `slug` changes between renders (e.g., navigating trips), the load effect fires but the save effect also fires immediately with the *new slug* before load finishes writing new state. This would overwrite the new slug's storage with stale data from the previous trip.

Fix: use a `slugRef` to track which slug was last loaded, and skip save when `slug !== slugRef.current`:

```ts
const slugRef = useRef<string>("");
useEffect(() => {
  loadFromStorage(slug);
  slugRef.current = slug;
}, [slug, loadFromStorage]);

useEffect(() => {
  if (slugRef.current !== slug) return; // not yet loaded for this slug
  saveToStorage(slug);
}, [slug, tripNights, transportMode, fuelCostPerKm, nightlyRates, saveToStorage]);
```

**2. `NightlyRateInput` draft state goes stale on external store update**

`draft` is initialized from `rate` only once at component mount:
```ts
const [draft, setDraft] = useState(rate ? String(rate) : "");
```

If the same homestay's rate is set from another code path (e.g., future import), the draft won't update. More practically, after `loadFromStorage` populates `nightlyRates`, the already-mounted `NightlyRateInput` components show empty inputs even though the store has values.

Fix: sync draft from store when the component is not focused:
```ts
const [isFocused, setIsFocused] = useState(false);
useEffect(() => {
  if (!isFocused) setDraft(rate ? String(rate) : "");
}, [rate, isFocused]);
```

**3. `CostEstimator` rendered twice — two instances of `loadFromStorage`**

`CostEstimator` is rendered in both the desktop Card and the mobile bottom sheet (see `page.tsx`). Both call `loadFromStorage(slug)` on mount. Since the store is a singleton, the second load call overwrites the first (same data, same key — no real harm), but the `loadedRef` is per-component so the save guard is independent per instance. Two save effects run on every change, causing duplicate localStorage writes.

Not a bug in practice (idempotent), but wasteful and fragile. Consider lifting load/save to a single hook or the page component.

---

### LOW Issues

**4. `0 nights` edge case not fully guarded in UI**

`setTripNights` clamps to `Math.max(1, nights)` in the store — correct. But the input uses `onChange={(e) => setTripNights(Number(e.target.value) || 1)`. If user types `0`, it maps to `1` via `|| 1` before hitting the store clamp. This is fine. However, if user clears the field (`""` → `Number("") = 0 || 1 = 1`), the input immediately shows `1` rather than allowing them to type a new number. Consider a draft pattern matching `NightlyRateInput`.

**5. No `aria-pressed` on transport mode toggle buttons**

The motorbike/car buttons act as a toggle group but only use `variant` for visual state. Screen readers won't know which is selected. Add `aria-pressed={transportMode === "motorbike"}` / `aria-pressed={transportMode === "car"}`.

**6. `calculateCost` and `formatVND` exported from a component file**

These pure utilities live in `cost-estimator.tsx` but are imported by `ranking-list.tsx`. Utilities should live in `src/lib/` (e.g., `src/lib/cost.ts`). Not a bug, but violates separation of concerns and makes the component a de-facto utility module.

**7. Tooltip uses `\n` in `title` attribute**

```tsx
title={`Accommodation: ${formatVND(accommodationCost)} VND\nTransport: ${formatVND(transportCost)} VND`}
```

`title` newlines render in some browsers but not all. Since the spec calls for a "tooltip breakdown on hover/tap", this works but mobile tap doesn't show `title` tooltips at all. AC says "hover/tap" — this misses the tap case on mobile. A low-priority gap vs the spec.

**8. Nightly rate input `w-24` may clip large VND numbers**

`1.200.000` is 9 chars. At `text-xs` in `w-24` (96px), it fits, but `12.000.000` (10 chars) may overflow. Minor but visually noticeable at high rates.

---

### Positive Observations

- Formula matches spec exactly: `transportCost = totalDrivingKm * 2 * fuelCostPerKm`.
- Correct use of `drivingKm ?? d.km` fallback when driving distance not yet loaded.
- `cheapestId`/`mostExpensiveId` correctly returns `null` when all costs are equal (no false highlights).
- `removeNightlyRate` uses destructuring to avoid mutation — idiomatic Zustand.
- `loadFromStorage` is try/caught with graceful degradation on corrupt data.
- `formatVND` uses `Intl.NumberFormat('vi-VN')` as specified; `Math.round` prevents floating-point display issues.
- `setTripNights` clamps to 1, preventing 0-night division-by-zero style bugs.
- `icon-xs` button size is defined in `button.tsx` — no phantom variant.
- TypeScript errors in build are pre-existing (comparison-mode branch, not this diff).
- README and architecture docs updated correctly.

---

### Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Users can set nightly rate per homestay | PASS |
| 2 | Users can set trip duration and transport mode | PASS |
| 3 | Total cost calculated and displayed per homestay in ranking | PASS |
| 4 | Cheapest homestay highlighted | PASS |
| 5 | Cost breakdown available on hover/tap | PARTIAL — hover only via `title`; mobile tap not supported |
| 6 | Numbers formatted in VND with separators | PASS |
| 7 | Settings persist in localStorage | PASS |
| 8 | Works without cost data (ranking still shows distances) | PASS |

---

### Recommended Actions

1. **(MEDIUM)** Fix `NightlyRateInput` stale draft: add `useEffect` to sync draft from store when not focused. This is the most user-visible bug (rates loaded from localStorage won't show in inputs).
2. **(MEDIUM)** Fix auto-save race for slug changes using `slugRef` approach above.
3. **(LOW)** Add `aria-pressed` to transport mode toggle buttons.
4. **(LOW)** Move `calculateCost` + `formatVND` to `src/lib/cost.ts`.
5. **(LOW)** Lift `loadFromStorage` to page level to avoid duplicate calls from two `CostEstimator` instances.
6. **(DEFER)** Mobile tap tooltip — replace `title` with a popover if mobile cost breakdown becomes a priority.

---

### Metrics
- Type Coverage: No new type errors introduced by this diff
- Test Coverage: No tests added (none in project currently)
- Linting Issues: 0 new (pre-existing TS errors from comparison-mode branch, unrelated)
