# Feature: Trip Templates

## Branch: `feature/trip-templates`
## Batch: A (parallel-safe)
## Effort: Low (~4 hours)

## Problem
New users face cold-start friction — they land on the app but don't know what to do. International visitors to Vietnam don't know popular destinations or homestay areas. Templates provide instant value and demonstrate the app's capabilities.

## Solution
Pre-built trip templates for popular Vietnam destinations. Users can browse templates and clone one as their starting point.

## Templates (initial set)

1. **Da Lat Weekend** — 3 homestays + 5 destinations (Xuan Huong Lake, Datanla Falls, etc.)
2. **Hoi An & Da Nang 3-Day** — 3 homestays + 6 destinations
3. **Phu Quoc Beach Escape** — 3 homestays + 5 destinations
4. **Ha Noi Old Quarter** — 3 homestays + 5 destinations (Hoan Kiem, Temple of Literature, etc.)
5. **Ho Chi Minh City Explorer** — 3 homestays + 6 destinations
6. **Ninh Binh & Tam Coc** — 2 homestays + 4 destinations

## Implementation

### Data Structure
```typescript
// src/lib/templates.ts
interface TripTemplate {
  id: string;
  name: string;
  description: string;  // 1-2 sentence summary
  region: string;       // "Central Highlands", "South", etc.
  duration: string;     // "2-3 days", "Weekend"
  coverEmoji: string;   // Simple visual identifier (used in card, not as icon)
  locations: Array<{
    type: LocationType;
    name: string;
    lat: number;
    lon: number;
    address: string | null;
    priority?: number;   // for destinations, 1-5
  }>;
}
```

### Files to Create
- `src/lib/templates.ts` — Template data (static, no API needed)
- `src/components/template-browser.tsx` — Grid of template cards
- `src/components/template-card.tsx` — Individual template preview card

### Files to Modify
- `src/components/anon-landing.tsx` — Add template browser section below hero
- `src/app/trip/[slug]/page.tsx` — Add "Start from template" option (optional, lower priority)

### UI Design
- Section on landing page: "Popular Trip Templates"
- 2-column grid on mobile, 3-column on desktop
- Each card: name, region badge, duration, location count, "Use Template" button
- Clicking "Use Template" → creates new trip with nanoid slug, pre-populates locations, redirects to trip page

### Clone Flow
1. User clicks "Use Template" on a template card
2. POST `/api/trips` with template name as trip name
3. Redirect to `/trip/{slug}`
4. On trip page load, detect empty trip + template param → populate store with template locations
5. Auto-save triggers, persisting to Supabase

Alternative (simpler): populate trip store client-side before API call, then auto-save handles persistence. This avoids modifying the API.

## Acceptance Criteria
- [ ] At least 6 Vietnam trip templates with real coordinates
- [ ] Template browser visible on landing page
- [ ] Clicking template creates a new trip pre-populated with locations
- [ ] Template locations appear on map immediately
- [ ] Distances auto-fetch after template loads
- [ ] Works for both anonymous and authenticated users
- [ ] Mobile responsive (cards stack properly)
