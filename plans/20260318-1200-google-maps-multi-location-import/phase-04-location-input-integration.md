# Phase 4: Location Input Integration

## Context Links
- Phase 3: `plans/20260318-1200-google-maps-multi-location-import/phase-03-import-preview-dialog.md`
- Location input: `src/components/location-input.tsx`
- Trip store: `src/store/trip-store.ts`
- Collab store: `src/store/collab-store.ts`

## Overview
Modify `LocationInput` to detect multi-location input, call `/api/extract-locations`, and open `ImportPreviewDialog`. Single-location flow unchanged.

## Key Insights
- `LocationInput` currently uses `useTripStore` directly. Both trip and collab pages use it; collab page bridges stores via `useCollabBridge` hook which syncs trip-store actions to collab-store. So calling `useTripStore.addLocation()` works for both contexts.
- Detection must happen on submit (Enter/click Add), not on every keystroke
- For multi-line paste (multiple URLs), swap `Input` to `Textarea` is optional but improves UX. Simpler: just detect newlines in the single Input value (users paste multi-line text into single-line inputs and browsers preserve it).

## Requirements
1. On paste-mode submit: check `isMultiLocationInput(input)` before single-location flow
2. If multi-location: call `POST /api/extract-locations` with loading state
3. On API response: open `ImportPreviewDialog`
4. On dialog confirm: loop `addLocation()` for each selected item
5. Clear input after successful import
6. Handle errors from API gracefully

## Architecture

```
LocationInput (modified)
  New state:
    importPreview: { locations, errors } | null
    extracting: boolean

  handlePaste() modified:
    if isMultiLocationInput(input):
      call /api/extract-locations
      set importPreview with response
    else:
      existing single-location flow (unchanged)

  render:
    ... existing JSX ...
    <ImportPreviewDialog
      open={importPreview !== null}
      onOpenChange={(open) => !open && setImportPreview(null)}
      locations={importPreview?.locations ?? []}
      errors={importPreview?.errors ?? []}
      onConfirm={handleBulkImport}
    />
```

## Related Code Files
- `src/components/location-input.tsx` (MODIFY)
- `src/components/import-preview-dialog.tsx` (consume)
- `src/lib/parsers.ts` (consume `isMultiLocationInput`)

## Implementation Steps

### 1. Add imports
```typescript
import { isMultiLocationInput } from "@/lib/parsers";
import { ImportPreviewDialog } from "./import-preview-dialog";
import type { LocationType } from "@/lib/types";
```

### 2. Add state
```typescript
const [importPreview, setImportPreview] = useState<{
  locations: Array<{ name: string; lat: number; lon: number; address: string | null }>;
  errors: string[];
} | null>(null);
const [extracting, setExtracting] = useState(false);
```

### 3. Modify `handlePaste`
Insert multi-location check at the top of the function, before existing flow:

```typescript
async function handlePaste() {
  const text = input.trim();
  if (!text) return;

  // Multi-location detection
  if (isMultiLocationInput(text)) {
    cancelPending();
    const controller = new AbortController();
    abortRef.current = controller;
    setExtracting(true);
    try {
      const res = await fetch("/api/extract-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.locations?.length > 0) {
        setImportPreview({ locations: data.locations, errors: data.errors ?? [] });
      }
      // If no locations extracted, fall through silently (errors shown if dialog opens)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    } finally {
      setExtracting(false);
    }
    return; // Don't fall through to single-location flow
  }

  // ... existing single-location flow unchanged ...
}
```

### 4. Add bulk import handler
```typescript
function handleBulkImport(
  items: Array<{ name: string; lat: number; lon: number; address: string | null; type: LocationType }>
) {
  items.forEach((item) => {
    addLocation({
      type: item.type,
      name: item.name,
      lat: item.lat,
      lon: item.lon,
      address: item.address,
      source: "google_maps",
    });
  });
  setImportPreview(null);
  setInput("");
}
```

### 5. Update loading state in button
Change disabled condition to include `extracting`:
```typescript
disabled={geocoding || extracting}
```
Change spinner condition similarly.

### 6. Render dialog
Add before closing `</div>` of root element:
```tsx
<ImportPreviewDialog
  open={importPreview !== null}
  onOpenChange={(open) => { if (!open) setImportPreview(null); }}
  locations={importPreview?.locations ?? []}
  errors={importPreview?.errors ?? []}
  onConfirm={handleBulkImport}
/>
```

### 7. Update placeholder text
Change paste placeholder to hint at multi-URL support:
```
"Paste Google Maps link(s) or directions URL..."
```

## Todo List
- [ ] Import `isMultiLocationInput` and `ImportPreviewDialog`
- [ ] Add `importPreview` and `extracting` state
- [ ] Modify `handlePaste` with multi-location branch
- [ ] Add `handleBulkImport` callback
- [ ] Update disabled/loading conditions for extracting state
- [ ] Render `ImportPreviewDialog` in JSX
- [ ] Update placeholder text
- [ ] Test: single URL still works as before
- [ ] Test: directions URL opens preview dialog
- [ ] Test: multiple URLs open preview dialog
- [ ] Test: collab mode works (addLocation broadcasts via bridge)

## Success Criteria
- Pasting single place URL: existing behavior, no dialog
- Pasting directions URL: shows loading -> opens preview with waypoints
- Pasting 3 short URLs on separate lines: resolves all, opens preview with 3 locations
- Confirming import adds all selected locations to map
- Canceling dialog does not add anything
- Works in both `/trip/[slug]` and `/collab/[slug]` pages

## Risk Assessment
- **Low**: Breaking existing single-URL flow -- guarded by `isMultiLocationInput` check, returns early only when true
- **Low**: Slow extraction for many short URLs -- parallel resolution, loading state visible
- **Medium**: `useCollabBridge` compatibility -- need to verify bridge syncs multiple rapid `addLocation` calls. Mitigated: bridge listens to trip-store changes, each `addLocation` triggers independently.

## Security Considerations
- User input sent to own API endpoint only
- No eval or dynamic code execution
- AbortController prevents stale responses

## Next Steps
After implementation: update `README.md` and `docs/architecture.md` per project rules. Run Playwright UAT tests per `CLAUDE.md`.

## Unresolved Questions
- Should the input switch to a `<textarea>` for paste mode to better show multi-line URLs? Current approach works (browsers preserve newlines in single-line inputs on paste) but textarea would be more explicit. Recommend: keep as `Input` for now (YAGNI), revisit if users report confusion.
