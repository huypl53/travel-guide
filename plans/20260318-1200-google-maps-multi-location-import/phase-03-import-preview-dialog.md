# Phase 3: Import Preview Dialog

## Context Links
- Phase 2: `plans/20260318-1200-google-maps-multi-location-import/phase-02-extract-locations-api.md`
- Existing dialog: `src/components/ui/dialog.tsx`
- Trip store: `src/store/trip-store.ts`
- Types: `src/lib/types.ts`

## Overview
Create `ImportPreviewDialog` -- a shadcn Dialog that shows extracted locations with checkboxes, type selectors, and a confirm button to bulk-import into the trip store.

## Key Insights
- No checkbox component in shadcn UI yet -- use native `<input type="checkbox">` styled with Tailwind, or install shadcn checkbox
- Dialog already available via `src/components/ui/dialog.tsx`
- `addLocation()` works identically in trip-store and collab-store -- dialog doesn't need to know which is active
- Component receives an `addLocation` callback prop to stay store-agnostic

## Requirements
1. Display list of extracted locations with name, lat/lon preview
2. Checkbox per location, select/deselect all toggle
3. Bulk type selector (Homestay / Destination) with per-row override
4. Show extraction errors as warnings
5. Confirm imports selected locations, cancel closes dialog
6. Loading state while API call in progress (passed from parent)

## Architecture

```
ImportPreviewDialog
  Props:
    open: boolean
    onOpenChange: (open: boolean) => void
    locations: Array<{ name, lat, lon, address }>
    errors: string[]
    onConfirm: (items: Array<{ name, lat, lon, address, type: LocationType }>) => void

  Internal State:
    selected: Set<number>  (indices)
    typeOverrides: Map<number, LocationType>
    bulkType: LocationType (default: "destination")
```

## Related Code Files
- `src/components/import-preview-dialog.tsx` (CREATE)
- `src/components/ui/dialog.tsx` (consume)

## Implementation Steps

### 1. Install shadcn checkbox (if not present)
```bash
npx shadcn@latest add checkbox
```
Or skip and use native checkbox with Tailwind styling to avoid extra dependency.

### 2. Create component file
```typescript
// src/components/import-preview-dialog.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LocationType } from "@/lib/types";

interface ExtractedLocation {
  name: string;
  lat: number;
  lon: number;
  address: string | null;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: ExtractedLocation[];
  errors: string[];
  onConfirm: (items: Array<ExtractedLocation & { type: LocationType }>) => void;
}
```

### 3. Component body
Key UI structure:
```
DialogHeader: "Import {n} Locations"
DialogDescription: brief instruction text

Bulk controls row:
  [Select All / None] | [All as: Homestay | Destination toggle]

Location list (scrollable, max-h-80):
  For each location:
    [checkbox] [name] [lat, lon truncated] [type badge: H/D toggle]

Error section (if errors.length > 0):
  Yellow warning with error messages

DialogFooter:
  [Cancel] [Import {selectedCount} locations]
```

### 4. Type toggle per row
Use a small button/badge that toggles between "H" (homestay) and "D" (destination). Color-coded: blue for homestay, green for destination (matching existing app conventions).

### 5. Confirm handler
```typescript
function handleConfirm() {
  const items = locations
    .filter((_, i) => selected.has(i))
    .map((loc, i) => ({
      ...loc,
      type: typeOverrides.get(i) ?? bulkType,
    }));
  onConfirm(items);
}
```

### 6. Select all / none
```typescript
function toggleAll() {
  if (selected.size === locations.length) {
    setSelected(new Set());
  } else {
    setSelected(new Set(locations.map((_, i) => i)));
  }
}
```

## Todo List
- [ ] Decide: install shadcn checkbox or use native (recommend native for YAGNI)
- [ ] Create `src/components/import-preview-dialog.tsx`
- [ ] Implement location list with checkboxes
- [ ] Implement bulk type selector
- [ ] Implement per-row type override toggle
- [ ] Implement select all / none
- [ ] Show errors as warnings
- [ ] Wire confirm/cancel handlers
- [ ] Test with 1, 5, 10, 20 locations for scroll behavior

## Success Criteria
- Dialog opens with correct location count
- Checkboxes toggle individually and with select-all
- Bulk type changes all non-overridden locations
- Per-row type override persists after bulk change
- Confirm only imports checked locations
- Dialog closes on confirm and cancel
- Errors displayed without blocking import

## Risk Assessment
- **Low**: Large location lists -- capped at 20 in API, scrollable container handles it
- **Low**: Dialog z-index conflicts -- shadcn Dialog handles this

## Security Considerations
- No sensitive data displayed; lat/lon and names from user's own paste
- No XSS risk: React escapes all rendered text

## Next Steps
Phase 4 wires this dialog into `LocationInput`.
