# Feature: Comparison Mode

## Branch: `feature/comparison-mode`
## Batch: C (parallel-safe — reads existing data)
## Effort: Medium (~4-5 hours)

## Problem
The ranking list shows homestays in order, but users can't easily compare 2-3 specific homestays side by side. The distance matrix exists but is information-dense and hard to parse for decision-making.

## Solution
A dedicated comparison view where users select 2-3 homestays and see them in columns with all metrics aligned.

## Implementation

### Data (already available)
- `RankedHomestay[]` from ranking computation
- `distances` from distance store
- `locations` with priorities from trip store

### Files to Create
- `src/components/comparison-view.tsx` — Main comparison component
- `src/components/comparison-card.tsx` — Single homestay column in comparison

### Files to Modify
- `src/app/trip/[slug]/page.tsx` — Add comparison section/toggle
- `src/store/trip-store.ts` — Add `comparisonIds: string[]` + `toggleComparison(id)` + `clearComparison()`

### UI Design

#### Entry Point
- In ranking list: each homestay row gets a "Compare" checkbox/toggle
- Max 3 selections — disable further checkboxes when 3 selected
- Floating bar at bottom: "Comparing 2 homestays — View Comparison" button

#### Comparison View
- 2-3 column layout (1 column per homestay)
- Each column shows:
  - Homestay name + rank badge (#1, #2, etc.)
  - Weighted average distance (highlight the winner in green)
  - Per-destination breakdown:
    - Destination name
    - Driving distance (km)
    - Driving time (min)
    - Highlight best value per row in green
  - Total driving time across all destinations
- "Best for" summary: "Closest to Beach", "Shortest total drive"
- Responsive: on mobile, stack columns vertically or use horizontal scroll

#### Visual Highlights
- Green cell = best value in that row
- Bold the overall winner column header
- Subtle background tint on winner column

### State
- `comparisonIds` in trip store (max 3 strings)
- Comparison view computes derived data from existing stores
- No new API calls needed

## Acceptance Criteria
- [x] Users can select 2-3 homestays for comparison
- [x] Side-by-side view shows all distance metrics aligned
- [x] Best values highlighted per row
- [x] Overall winner indicated
- [x] Works on mobile (scrollable or stacked)
- [x] Comparison clears when user deselects all
- [x] No extra API calls — uses cached distance data

## Status: IMPLEMENTED — pending minor fixes (see review report)

### Code Review Issues (2026-03-17)
- MEDIUM: comparison toggle button missing `aria-label` + `aria-pressed` (`ranking-list.tsx`)
- MEDIUM: ComparisonBar X button missing `aria-label` (`comparison-bar.tsx`)
- MEDIUM: "Shortest total drive" label emitted when all totals are 0 — guard `bestValues.totalMinutes > 0` (`comparison-view.tsx` L102)
- LOW: unrelated removals (notes/photoUrl) bundled in this branch

Report: `plans/features/reports/260317-code-reviewer-comparison-mode-review.md`
