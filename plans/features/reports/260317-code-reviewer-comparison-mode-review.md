# Code Review: Feature/Comparison-Mode
Date: 2026-03-17
Branch: feature/comparison-mode vs origin/master

## Code Review Summary

### Scope
- Files reviewed: 20 changed files (~489 insertions, ~310 deletions)
- Key focus: comparison-view.tsx, comparison-card.tsx, comparison-bar.tsx, ranking-list.tsx, trip-store.ts
- TypeScript check: clean (0 errors)
- Tests: 90/90 passing

### Overall Assessment
Implementation is solid. Core feature works correctly, store design is clean, math is correct, and tests pass. A few accessibility gaps and one edge-case bug need attention.

---

### Acceptance Criteria Status
- [x] Users can select 2-3 homestays for comparison — toggle in ranking-list, max-3 enforced in store
- [x] Side-by-side view shows all distance metrics aligned — comparison-view/card columns
- [x] Best values highlighted per row — green highlight via isBest() with 0.01 epsilon
- [x] Overall winner indicated — bold header + Trophy icon + bg tint on winner column
- [x] Works on mobile (scrollable or stacked) — overflow-x-auto with min-w-min in mobile sheet; hidden md:block desktop card
- [x] Comparison clears when user deselects all — clearComparison() + auto-remove on location delete
- [x] No extra API calls — pure derived computation from existing stores

---

### MEDIUM Issues

**1. Accessibility: comparison toggle button missing aria-label**
File: `src/components/ranking-list.tsx` ~L54
The `<button>` that toggles comparison has only a `title` attribute. Screen readers do not consistently read `title`. Should add `aria-label` equal to the `title` value, and `aria-pressed={isComparing}` to convey toggle state.

```tsx
// current
<button title={atMax ? "Max 3 homestays" : ...} ...>

// fix
<button
  title={...}
  aria-label={atMax ? "Max 3 homestays" : isComparing ? "Remove from comparison" : "Add to comparison"}
  aria-pressed={isComparing}
  ...>
```

**2. Accessibility: ComparisonBar "X" close button missing aria-label**
File: `src/components/comparison-bar.tsx` L30
The bare `<button>` wrapping the X icon has no accessible label. Add `aria-label="Clear comparison"`.

**3. Edge case: `bestTotal = 0` when no driving data yet causes false highlight**
File: `src/components/comparison-view.tsx` L63-68
When all `drivingMinutes` are null/0 (distances not yet fetched), `bestTotal` = 0 and every card with `totalMinutes === 0` gets green-highlighted as "best". The `totalMinutes > 0` guard in `comparison-card.tsx` suppresses the card display, but the label "Shortest total drive" in `bestForLabelsMap` can still be emitted for every card when all totals equal 0.

In `comparison-view.tsx` ~L102:
```tsx
// current
if (totalMin > 0 && Math.abs(totalMin - bestValues.totalMinutes) < 0.01) {
  labels.push("Shortest total drive");
}
// fix: also guard bestValues.totalMinutes > 0
if (totalMin > 0 && bestValues.totalMinutes > 0 && Math.abs(totalMin - bestValues.totalMinutes) < 0.01) {
```

**4. Mobile: ComparisonView not shown in mobile bottom sheet context**
File: `src/app/trip/[slug]/page.tsx` L162, L196
Desktop shows `ComparisonView` in a `hidden md:block` card above the fold. Mobile bottom sheet renders `<ComparisonView />` (no `wrapped` prop) inside the sheet between RankingList and DistanceMatrix. When comparing, the sheet content grows tall — the comparison panel pushes DistanceMatrix down without indication. A tab/toggle inside the sheet to switch between Ranking, Comparison, and Matrix would give better UX, but current implementation is functional if not ideal.

---

### LOW Issues

**5. Per-destination best computation anchored to first comparison item**
File: `src/components/comparison-view.tsx` L46-59
Iterates `comparedData[0].ranked.distances` to build `perDestination` map. If `comparedData[0]` has fewer destinations than other compared items (theoretically shouldn't happen since all share same trip destinations, but worth noting), destinations unique to other items won't be in the map. In practice with current data model this can't occur, but the assumption is implicit.

**6. `isBest` epsilon 0.01 km is arbitrary**
File: `src/components/comparison-card.tsx` L29
0.01 km = 10 meters. Fine for driving distances. Not a bug, just worth a comment.

**7. Unrelated removals in this branch**
The branch removes `notes`/`photoUrl` from `Location`, `LocationDetail` component, `use-auto-save.ts`, `isSafeImageUrl`, `InfoWindow` in Google Maps, and Leaflet Popups with images. These are scope creep — they belong to feature/03-location-notes-photos cleanup, not comparison-mode. They don't break anything but muddy the diff.

---

### Positive Observations
- Store design is clean: `comparisonIds: string[]` is minimal, max-3 enforced in `toggleComparison`, cleared on `removeLocation` and `reset` — no orphaned IDs possible.
- `rankHomestays` is called once in `ComparisonView` via `useMemo` and filtered — no redundant computation.
- `isBest()` epsilon comparison avoids floating-point false negatives.
- `comparedData.length < 2` guard prevents rendering with insufficient data.
- Winner determination uses `reduce` over `comparedData` instead of index assumption.
- `font-semibold` appears twice on winner header (`font-semibold` from base + `font-bold` override) — harmless but redundant: `<h4 className="... font-semibold ... font-bold">` — Tailwind last-wins resolves to bold correctly.

---

### Recommended Actions
1. **[MEDIUM]** Add `aria-label` + `aria-pressed` to ranking-list comparison toggle button
2. **[MEDIUM]** Add `aria-label="Clear comparison"` to ComparisonBar X button
3. **[MEDIUM]** Guard `bestValues.totalMinutes > 0` before emitting "Shortest total drive" label
4. **[LOW]** Consider adding a comment on the 0.01 epsilon choice
5. **[LOW]** Future: separate unrelated notes/photos removal into its own cleanup commit/branch
