# Code Review — feature/location-notes-photos

**Date:** 2026-03-17
**Branch:** `feature/location-notes-photos`
**Reviewer:** code-reviewer agent

---

## Code Review Summary

### Scope
- Files reviewed: 14 changed files (full diff `origin/master..HEAD`)
- Lines of code analyzed: ~350 net additions
- Review focus: acceptance criteria, schema, store actions, type safety, UI/UX, edge cases, map integration, test fixtures

### Overall Assessment
Implementation is clean and well-scoped. Schema, store, auto-save persistence, and test fixtures are all correct. Three real issues need fixing before merge: Google Maps has no visual photo in popups (spec miss), photo URLs have no XSS sanitization (`javascript:` / `data:` scheme accepted), and `LocationDetail` local state goes stale when a location's `notes`/`photoUrl` changes externally (another tab, store reset).

---

### Critical Issues

None — no data-loss or auth bypass introduced.

---

### High Priority Findings

**H1 — XSS via `javascript:` or `data:` photo URL (all `<img src={photoUrl}>` sites)**

All four `<img>` elements render the user-supplied URL directly with no scheme validation:
- `src/components/location-detail.tsx:42`
- `src/components/map-providers/leaflet-map.tsx:88,109`
- `src/app/trip/[slug]/share/page.tsx:62,81`

`<img src="javascript:alert(1)">` is a no-op in modern browsers, but `data:text/html,...` embedded into `<img>` can trigger XSS in some contexts and CSP-less environments. The spec says "accept any image URL" but that should mean any _http(s)_ URL.

Fix — add a guard before rendering (in `LocationDetail`, in the Leaflet popup helper, in share page):
```ts
function isSafeImageUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
```
Use `isSafeImageUrl(photoUrl)` instead of bare `photoUrl &&` truthiness check.

**H2 — Google Maps popup does NOT show photo thumbnail (acceptance criterion partially unmet)**

Spec: _"Map popup: show photo (if exists) + first line of notes"_

Leaflet: renders an `<img>` + `<p>` inside `<Popup>` — correct.
Google Maps: only puts the first line of notes into the `title` attribute of `AdvancedMarker` (visible as a browser tooltip on hover). No `InfoWindow` with photo is rendered.

`src/components/map-providers/google-map.tsx:132,145` — `title` prop only.

The spec says "info window", and Google Maps already has click-handler scaffolding (`handleMarkerClick`). An `InfoWindow` component from `@vis.gl/react-google-maps` needs to be wired up with photo + notes, matching the Leaflet popup layout.

---

### Medium Priority Improvements

**M1 — `LocationDetail` local state goes stale on external update**

`useState(location.notes ?? "")` and `useState(location.photoUrl ?? "")` are initialized once from props. If the location is modified by another consumer (e.g., a future "import" action, store reset, or another browser tab via Supabase realtime), the textarea/input will show the old value until the user collapses and reopens the panel.

Fix: add `useEffect` to sync when `location.id` changes or use `key={location.id}` on the component to force remount:
```tsx
// In location-list.tsx where LocationDetail is rendered:
{expandedId === loc.id && <LocationDetail key={loc.id} location={loc} />}
```
`key={loc.id}` already would remount on id change, but won't help for in-place updates to the same location. A `useEffect` guard is cleaner:
```ts
useEffect(() => { setNotes(location.notes ?? ""); }, [location.notes]);
useEffect(() => { setPhotoUrl(location.photoUrl ?? ""); setImgError(false); }, [location.photoUrl]);
```

**M2 — Auto-save race: blur fires store update _after_ debounce may have already started**

When a user types in the textarea and immediately clicks away, the sequence is:
1. `onChange` — sets local `notes` state
2. Store subscription fires 2 s debounce timer
3. `onBlur` — calls `updateLocationNotes(id, notes)` which updates store
4. Store subscription resets debounce timer (new 2 s wait)

This is fine — the blur correctly resets the timer with fresh data. BUT if the user types → blurs → immediately closes/navigates, the 2 s timer may fire on the unmounted component. The existing `clearTimeout` in `useAutoSave`'s cleanup handles this correctly at the hook level, so the actual save will be lost on immediate navigation.

This is an existing limitation of the debounce strategy (pre-dates this feature), but the notes textarea increases the likelihood since it's edited then blurred then the user may immediately click elsewhere. Not a regression — acceptable as-is, noting only.

**M3 — Spec says use `next/image` with `unoptimized`; all sites use bare `<img>`**

Spec: _"Display with `next/image` using `unoptimized` prop (external URLs)"_

All four render sites use `<img>` instead of Next.js `<Image unoptimized>`. `next/image` is not strictly required (bare `<img>` works for external URLs), but the spec is explicit. More practically, `next/image` provides lazy loading and layout stability. Leaflet popups are a special case (Leaflet renders into a DOM portal outside Next.js's tree) where `<Image>` is harder to use — `<img>` is acceptable there.

For `LocationDetail` and `share/page.tsx`, switch to `<Image unoptimized>` to match spec.

---

### Low Priority Suggestions

**L1 — Leaflet popup images have no broken-image fallback**

`location-detail.tsx` has `onError → setImgError` with `ImageOff` icon. Leaflet popup `<img>` tags at `leaflet-map.tsx:88,109` have no `onError` handler — they silently show a broken image icon from the browser. Add `onError={(e) => (e.currentTarget.style.display = 'none')}` as a minimal fix.

**L2 — Share page uses inline `photo_url` type annotations instead of a typed interface**

`src/app/trip/[slug]/share/page.tsx` maps over locations with inline object types `(l: { id: string; name: string; notes: string | null; photo_url: string | null })`. The `Location` type in `src/lib/types.ts` uses camelCase (`photoUrl`) while Supabase returns snake_case (`photo_url`). The inline cast is correct but brittle — a dedicated `DbLocation` type or Supabase generated types would prevent future drift.

**L3 — `updateLocationNotes` / `updateLocationPhoto` store signature accepts `string` but stores `string | null`**

Interface declares `updateLocationNotes: (id: string, notes: string) => void` (non-nullable `notes`), but the implementation coerces `notes || null`. Callers can't pass `null` to explicitly clear notes — they must pass `""`. This is consistent with the current usage but the interface is misleading. Either accept `string | null` or document the `""` → `null` coercion.

---

### Positive Observations

- Schema migration is minimal and correct — exactly what the spec prescribes.
- Auto-save integration (`use-auto-save.ts`) correctly maps `photoUrl ↔ photo_url` in both the insert (line 51) and load (line 110) directions.
- Test fixtures updated in both test files — no TypeScript errors.
- `LocationDetail` broken-image fallback with `ImageOff` is clean and uses the correct Zustand pattern.
- `StickyNote` icon hint in the list row is a nice low-cost discoverability win.
- Store actions correctly coerce `""` to `null` (`notes || null`) so the DB never stores empty strings.
- Read-only share view correctly renders notes/photo inline without exposing `LocationDetail` (which reads from the mutable store).
- README and `docs/architecture.md` both updated.

---

### Recommended Actions

1. **[H2 — before merge]** Wire up `InfoWindow` in `google-map.tsx` to show photo + notes on marker click, matching Leaflet popup layout.
2. **[H1 — before merge]** Add `isSafeImageUrl()` guard to all four `<img src={...}>` render sites.
3. **[M1 — before merge]** Add `useEffect` sync in `LocationDetail` for `location.notes` / `location.photoUrl`, or add `key={location.id}` to force remount.
4. **[M3 — nice-to-have]** Replace bare `<img>` with `<Image unoptimized>` in `LocationDetail` and `share/page.tsx`.
5. **[L1 — nice-to-have]** Add `onError` to Leaflet popup `<img>` tags to suppress broken image icon.
6. **[L3 — nice-to-have]** Change store interface signatures to `(id: string, notes: string | null)` for clarity.

---

### Metrics
- TypeScript type check: PASS (0 errors)
- Linting issues: not run (not in scope)
- Acceptance criteria met: 5/7 fully, 2/7 partially (Google Maps photo, broken-image fallback in popups)

### Unresolved Questions
- Does the project have a Supabase CSP / `Content-Security-Policy` header that would block `data:` image URLs already? If so, H1 severity drops to Medium.
- Is there a plan to add Supabase Realtime sync? If yes, M1 (stale local state) becomes High.
