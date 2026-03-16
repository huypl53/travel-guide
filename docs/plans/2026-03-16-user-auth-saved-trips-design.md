# User Auth & Saved Trips Design

## Overview

Add user authentication and trip management to the map-locator app. Logged-in users get a "My Trips" list on the landing page. Anonymous users retain full access to all existing features.

## Decisions

- **Auth provider:** Supabase Auth (already in stack)
- **Auth methods:** Google OAuth + magic link (passwordless email)
- **Anonymous access:** Full access, same as today. Login is opt-in for trip history.
- **History behavior:** Trips created by logged-in users auto-save. Shared trips visited by others require explicit "Save to My Trips."
- **Trip list:** Unified "My Trips" on `/` when logged in. Shows own + saved shared trips.
- **Trip card info:** Name, date, homestay/destination count, top-ranked homestay, "Saved" badge for bookmarked shared trips.
- **Trip card actions:** Open, share link, delete.
- **Approach:** Supabase Auth + RLS + `@supabase/ssr` for server-rendered auth-aware pages.

## Authentication Architecture

### Clients

- **Server client** (`src/lib/supabase-server.ts`): cookie-based, used in Server Components and Route Handlers via `@supabase/ssr`.
- **Browser client** (`src/lib/supabase-browser.ts`): refactored from existing `supabase.ts`, used in client components.
- **Middleware** (`src/middleware.ts`): refreshes auth session on every request to keep cookies alive.

### Auth Flow

1. User clicks "Sign in" in header → modal opens with Google button + email input.
2. Google OAuth: redirect to Google → callback to `/api/auth/callback` → sets session cookies → redirect back.
3. Magic link: enter email → receive email → click link → `/api/auth/callback` → sets session cookies.

### Auth UI

- Login/signup modal triggered from header — no separate `/login` page.
- Logged out: header shows "Sign in" button.
- Logged in: header shows avatar/email with dropdown (My Trips, Sign out).

## Database Schema Changes

### Modify `trips` table

```sql
ALTER TABLE trips ADD COLUMN user_id uuid REFERENCES auth.users;
CREATE INDEX idx_trips_user_id ON trips(user_id);
```

`user_id` is nullable — anonymous trips have no owner.

### New `saved_trips` table

```sql
CREATE TABLE saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trip_id)
);
```

`trips.user_id` = who created it. `saved_trips` = who bookmarked it.

### RLS Policies

**trips:**
- `SELECT`: `user_id = auth.uid()` OR accessed via `share_slug` (anon read) OR `user_id IS NULL` (anonymous trip)
- `INSERT`: always allow
- `UPDATE`/`DELETE`: `user_id = auth.uid()` or `user_id IS NULL`

**saved_trips:**
- `SELECT`/`INSERT`/`DELETE`: `user_id = auth.uid()`

**locations:**
- Inherit access through parent `trip_id` — allow if the trip passes its policy.

## Landing Page & My Trips

### Conditional rendering on `/`

Server Component checks auth via server Supabase client:
- **Logged out:** current landing page (New Trip button, app description)
- **Logged in:** My Trips list with New Trip button at top

### Trip card contents

- Trip name (or "Untitled Trip")
- Relative date ("2 days ago")
- "3 homestays, 5 destinations"
- "Saved" badge for bookmarked shared trips
- Top-ranked homestay name

### Trip card actions

- Click → open trip workspace
- Share icon → copy share link
- Delete icon → confirmation → remove trip or `saved_trips` entry

## Trip Ownership

- Anonymous user creates trip → `user_id = NULL`, works as today.
- Logged-in user creates trip → `user_id = auth.uid()`, auto-appears in My Trips.
- No retroactive claiming of anonymous trips on login (keeps logic simple).

### Saving shared trips

On `/trip/[slug]/share`, logged-in users see "Save to My Trips" button → creates `saved_trips` row.

## Header Component

New persistent header in root layout:
- Left: app name → links to `/`
- Right (logged out): "Sign in" button
- Right (logged in): avatar/email dropdown → My Trips, Sign out

## File Changes

### New files

| File | Purpose |
|------|---------|
| `src/lib/supabase-server.ts` | Server-side Supabase client (cookie-based) |
| `src/lib/supabase-browser.ts` | Rename/refactor existing `supabase.ts` |
| `src/middleware.ts` | Refresh auth session middleware |
| `src/app/api/auth/callback/route.ts` | OAuth/magic link callback |
| `src/components/auth-dialog.tsx` | Login modal (Google + magic link) |
| `src/components/header.tsx` | Navbar with auth state |
| `src/components/trip-card.tsx` | Card for My Trips list |
| `src/components/my-trips-list.tsx` | Trip list server component |
| `supabase/migrations/002_auth_and_saved_trips.sql` | Schema + RLS |

### Modified files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add Header |
| `src/app/page.tsx` | Conditional: My Trips vs landing |
| `src/app/trip/[slug]/share/page.tsx` | "Save to My Trips" button |
| `src/app/api/trips/route.ts` | Attach `user_id` on create |
| `src/app/api/trips/[slug]/route.ts` | Add DELETE handler |
| `src/lib/types.ts` | Add `SavedTrip`, update `Trip` |
| `package.json` | Add `@supabase/ssr` |

### Unchanged

Map components, ranking, distance matrix, parsers, Zustand store — all remain as-is.

## Testing Strategy

**Unit tests:** RLS policies, auth callback, trip API changes (user_id, DELETE).

**Component tests:** Header (auth states), My Trips list (cards, empty state), auth dialog, trip card (info + actions).

**Integration tests:** Sign in → create → see in list → delete. Save shared trip → appears in list → unsave.

**Skipped:** E2E OAuth redirect tests, Supabase Auth internals.
