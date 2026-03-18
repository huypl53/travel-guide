# Google Maps Multi-Location Import

## Goal
Allow users to paste Google Maps directions URLs or multiple Maps URLs at once, extracting all locations for bulk import with a preview dialog.

## Scope
- Parse directions URLs (`/maps/dir/A/B/C/`) into multiple waypoints
- Detect multiple Google Maps URLs in pasted text
- New API endpoint for server-side extraction (geocoding + short URL resolution)
- Preview dialog with per-location type selection and checkbox toggling
- Seamless integration into existing `LocationInput` paste flow

## Phases

| Phase | File | What |
|-------|------|------|
| 1 | [phase-01-parser-extensions.md](phase-01-parser-extensions.md) | Add `isDirectionsUrl`, `parseDirectionsUrl`, `extractUrlsFromText` to parsers.ts |
| 2 | [phase-02-extract-locations-api.md](phase-02-extract-locations-api.md) | `POST /api/extract-locations` endpoint |
| 3 | [phase-03-import-preview-dialog.md](phase-03-import-preview-dialog.md) | `ImportPreviewDialog` component |
| 4 | [phase-04-location-input-integration.md](phase-04-location-input-integration.md) | Wire multi-location detection into LocationInput |

## Files Changed

| File | Action |
|------|--------|
| `src/lib/parsers.ts` | MODIFY - add 3 functions |
| `src/app/api/extract-locations/route.ts` | CREATE - extraction endpoint |
| `src/components/import-preview-dialog.tsx` | CREATE - preview UI |
| `src/components/location-input.tsx` | MODIFY - detect multi-location, open dialog |

## Key Decisions
- **POST not GET** for extract-locations: body can be large (multiple URLs)
- **Server-side geocoding only**: directions waypoints need Nominatim, already available server-side
- **No new store methods**: dialog calls existing `addLocation()` in a loop
- **Textarea swap**: paste mode switches to textarea when multi-line detected (or user clicks a toggle)
- **Collab-compatible**: `LocationInput` already used in both trip and collab pages; both use `useTripStore` directly (collab page bridges via `useCollabBridge`)

## Out of Scope
- Google Places API integration
- Shared lists/collections scraping
- Saving import history
