# Feature: Location Notes & Photos

## Branch: `feature/location-notes-photos`
## Batch: B (schema change — run alone)
## Effort: Medium (~4-5 hours)

## Problem
Pinned locations are just names + coordinates. Users can't add context like "has a pool", "closes at 8pm", or attach a photo to remember what a place looks like. Shared trips feel sterile.

## Solution
Add `notes` (text) and `photoUrl` (string) fields to each location. Display in location list and on map popups.

## Schema Change

```sql
-- New migration: 003_location_notes_photos.sql
ALTER TABLE locations ADD COLUMN notes TEXT DEFAULT NULL;
ALTER TABLE locations ADD COLUMN photo_url TEXT DEFAULT NULL;
```

## Implementation

### Files to Modify
- `src/lib/types.ts` — Add `notes: string | null` and `photoUrl: string | null` to `Location` interface
- `src/store/trip-store.ts` — Add `updateLocationNotes(id, notes)` and `updateLocationPhoto(id, photoUrl)` actions
- `src/components/location-list.tsx` — Add inline note display + edit capability
- `src/components/map-providers/leaflet-map.tsx` — Show notes/photo in marker popup
- `src/components/map-providers/google-map.tsx` — Show notes/photo in info window
- `src/app/api/trips/[slug]/route.ts` — Include new fields in GET/POST

### Files to Create
- `supabase/migrations/003_location_notes_photos.sql` — Schema migration
- `src/components/location-detail.tsx` — Expandable detail panel for a location (notes + photo)

### UI Design
- In location list: small note icon if notes exist, click to expand
- Expanded view: textarea for notes (auto-save on blur), URL input for photo
- Photo displayed as small thumbnail (64x64) next to location name
- Map popup: show photo (if exists) + first line of notes
- No file upload — just URL input (keep it simple, users paste from Google Photos, Imgur, etc.)

### Photo Handling
- Accept any image URL
- Display with `next/image` using `unoptimized` prop (external URLs)
- Fallback to a placeholder icon if URL fails to load
- No server-side processing — purely client-side display

## Acceptance Criteria
- [x] Users can add/edit notes per location
- [x] Users can paste a photo URL per location
- [x] Notes and photos persist across page reloads (Supabase)
- [~] Map popups show notes and photo thumbnail — Leaflet: YES (photo + notes); Google Maps: notes only via `title` tooltip, NO visual InfoWindow with photo
- [x] Shared trip viewers can see notes and photos (read-only) — via share/page.tsx inline rendering; `LocationDetail` component not exposed on share page (correct)
- [~] Notes auto-save (debounced, same as other trip data) — auto-save fires via store subscription (correct); but blur-triggered store update races with the 2 s debounce (see review)
- [x] Graceful fallback when photo URL is broken — `ImageOff` icon in `LocationDetail`; NO fallback in Leaflet popups or share page

## Review Status (2026-03-17)
**Overall: MERGEABLE with fixes.** 3 issues should be addressed before merge; see `plans/features/reports/260317-code-reviewer-notes-photos-review.md`.
