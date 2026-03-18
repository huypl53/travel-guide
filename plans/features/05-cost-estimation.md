# Feature: Cost Estimation

## Branch: `feature/cost-estimation`
## Batch: C (parallel-safe — reads existing data)
## Effort: Low-Medium (~3 hours)

## Problem
Users rank homestays by distance, but the real question is: "Which homestay is cheapest overall when I factor in transport costs?" A homestay that's 10km further but $20/night cheaper might win.

## Solution
Let users enter nightly rate per homestay and trip duration. App calculates total trip cost = accommodation + estimated transport.

## Formula
```
transportCost = totalDrivingKm * 2 * fuelCostPerKm  (round trip)
accommodationCost = nightlyRate * nights
totalCost = transportCost + accommodationCost
```

Default fuel cost: 3,000 VND/km (motorbike) or 6,000 VND/km (car) — user-selectable.

## Implementation

### Files to Create
- `src/components/cost-estimator.tsx` — Cost estimation panel

### Files to Modify
- `src/store/trip-store.ts` — Add per-homestay `nightlyRate: number | null`, trip-level `nights: number`, `transportMode: 'motorbike' | 'car'`
- `src/lib/types.ts` — Add `nightlyRate` to Location type (or keep in store only since it's not persisted to Supabase initially)
- `src/components/ranking-list.tsx` — Show cost column/badge next to each ranked homestay
- `src/app/trip/[slug]/page.tsx` — Add cost settings panel

### UI Design

#### Settings Bar (above ranking list)
- Trip duration: number input (nights)
- Transport mode: toggle between motorbike/car icons
- Fuel cost: pre-filled based on mode, editable

#### In Ranking List
- New column/badge per homestay: estimated total cost
- Color-coded: cheapest = green badge, most expensive = red
- Tooltip breakdown: "Accommodation: 2,400,000 VND + Transport: 180,000 VND"

#### Cost Input per Homestay
- In location list: small input field for nightly rate (VND)
- Placeholder: "Nightly rate (VND)"
- Format large numbers with dots: 1.200.000

### Number Formatting
- Use `Intl.NumberFormat('vi-VN')` for VND display
- Input accepts plain numbers, display formats with separators

### Persistence
- Phase 1: localStorage only (no schema change)
- Phase 2 (future): add columns to Supabase if users want shared cost data

## Acceptance Criteria
- [x] Users can set nightly rate per homestay
- [x] Users can set trip duration and transport mode
- [x] Total cost calculated and displayed per homestay in ranking
- [x] Cheapest homestay highlighted
- [~] Cost breakdown available on hover/tap — hover only (title attr); mobile tap not supported
- [x] Numbers formatted in VND with separators
- [x] Settings persist in localStorage
- [x] Works without cost data (ranking still shows distances as before)

## Implementation Status: COMPLETE (minor fixes recommended before merge)

### Known Issues (from code review 2026-03-17)
- MEDIUM: `NightlyRateInput` draft state stale after `loadFromStorage` — rates loaded from localStorage won't populate inputs until user interacts. Fix: sync draft from store when input not focused.
- MEDIUM: Auto-save race condition when slug changes — save effect may fire before load completes for new slug. Fix: use `slugRef` to guard save by loaded slug.
- LOW: No `aria-pressed` on transport mode toggle buttons.
- LOW: `calculateCost`/`formatVND` should move to `src/lib/cost.ts` (currently in component file).
- LOW: Two `CostEstimator` instances cause duplicate localStorage writes.

### Review Report
See `plans/features/reports/260317-code-reviewer-cost-estimation-review.md`
