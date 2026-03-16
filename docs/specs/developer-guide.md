# Developer Guide

Quick reference for continuing development on this project.

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Header + metadata)
│   ├── page.tsx                  # Landing page (auth-aware)
│   ├── reset-password/page.tsx   # Password reset form
│   ├── trip/[slug]/
│   │   ├── page.tsx              # Trip workspace (main UI)
│   │   └── share/page.tsx        # Read-only shared view
│   └── api/                      # API routes (see api-reference.md)
│       ├── auth/callback/
│       ├── distances/
│       ├── directions/           # Legacy — use /distances instead
│       ├── routes/
│       ├── geocode/
│       ├── resolve-url/
│       ├── trips/[slug]/
│       └── saved-trips/
├── components/
│   ├── header.tsx                # Nav bar + auth state
│   ├── auth-dialog.tsx           # Sign in/up modal
│   ├── anon-landing.tsx          # Hero for anonymous users
│   ├── my-trips-list.tsx         # User's trip grid
│   ├── trip-card.tsx             # Trip summary card
│   ├── save-trip-button.tsx      # Save shared trip to account
│   ├── map-view.tsx              # Dynamic import wrapper (SSR-safe)
│   ├── map-inner.tsx             # Leaflet map (markers, polylines, flyTo)
│   ├── location-input.tsx        # Add locations (URL, search, file upload)
│   ├── location-list.tsx         # Location items with priority + remove
│   ├── priority-stars.tsx        # Star rating widget (1-5)
│   ├── ranking-list.tsx          # Homestay rankings by distance
│   ├── distance-matrix.tsx       # NxM distance table
│   ├── share-export.tsx          # Share link + JSON export
│   └── ui/                       # shadcn/ui primitives (Base UI)
├── hooks/
│   ├── use-auto-save.ts          # Persist trip to Supabase (2s debounce)
│   └── use-auto-fetch-distances.ts # Fetch OSRM distances (300ms debounce)
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── distance.ts               # haversineKm()
│   ├── osrm.ts                   # OSRM URL builders, response parsers, polyline decoder
│   ├── parsers.ts                # Google Maps URL, CSV, JSON parsers
│   ├── ranking.ts                # Priority-weighted ranking algorithm
│   ├── utils.ts                  # cn() for Tailwind class merging
│   ├── supabase-browser.ts       # Browser Supabase client (singleton)
│   └── supabase-server.ts        # Server Supabase client (cookie-based)
├── store/
│   ├── trip-store.ts             # Trip state (locations, selection)
│   └── distance-store.ts         # Driving distances + route geometries
├── test/
│   └── setup.ts                  # Vitest jsdom setup
└── middleware.ts                 # Auth session refresh on every request
```

## Setup

```bash
# Install
npm install

# Local Supabase (requires Docker)
npx supabase start              # starts local DB + auth
npx supabase db push            # apply migrations

# Environment
cp .env.example .env.local      # then fill in:
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>

# Dev server
npm run dev                     # http://localhost:3000
```

## Commands

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start dev server (Turbopack)   |
| `npm run build`   | Production build               |
| `npm run lint`    | ESLint                         |
| `npm run test`    | Run all tests (vitest)         |
| `npm run test:watch` | Tests in watch mode         |

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Framework  | Next.js 16 (App Router, Turbopack)          |
| UI         | React 19, Tailwind CSS 4, shadcn/ui (Base UI) |
| State      | Zustand 5                                   |
| Maps       | Leaflet + react-leaflet                     |
| Auth/DB    | Supabase (PostgreSQL + Auth + RLS)          |
| Routing    | OSRM (public demo server)                   |
| Geocoding  | Nominatim (OpenStreetMap)                   |
| Testing    | Vitest + Testing Library                    |
| CI         | GitHub Actions (lint → test → build)        |

## Adding a New Feature — Checklist

1. **Types first** — Add/update interfaces in `src/lib/types.ts`
2. **Store** — Add state/actions to existing Zustand store, or create new one
3. **API route** — If external service needed, create `src/app/api/[name]/route.ts`
4. **Lib/utility** — Pure logic goes in `src/lib/` with unit tests
5. **Component** — React component in `src/components/`
6. **Hook** — If component needs side-effects tied to store, create in `src/hooks/`
7. **Wire in** — Import in the page (`src/app/trip/[slug]/page.tsx` or landing)
8. **Tests** — Unit tests in `__tests__/` directories, naming: `*.test.ts(x)`
9. **DB migration** — If schema change: `supabase/migrations/NNN_description.sql`
10. **Docs** — Update `docs/architecture.md` and `README.md`

## Adding a Database Migration

```bash
# Create migration file
touch supabase/migrations/003_your_feature.sql

# Write SQL (include RLS policies if new table)
# Apply locally
npx supabase db push

# Push to remote
npx supabase db push --linked
```

Migration files are numbered sequentially: `001_initial.sql`, `002_auth_and_saved_trips.sql`, etc.

## Testing Patterns

**Unit test for lib functions:**
```typescript
// src/lib/__tests__/my-feature.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/my-feature";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

**Store test with mocked fetch:**
```typescript
import { vi, beforeEach, afterEach } from "vitest";

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

it("fetches data", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: "value" }),
  });
  await store.getState().fetchSomething();
  expect(store.getState().data).toBe("value");
});
```

**Component test:**
```typescript
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/my-component";

it("renders correctly", () => {
  render(<MyComponent prop="value" />);
  expect(screen.getByText("value")).toBeInTheDocument();
});
```

## Key Conventions

- **Path alias:** `@/` maps to `src/` (e.g., `import { foo } from "@/lib/foo"`)
- **UI components:** shadcn/ui in `src/components/ui/` — uses Base UI (`@base-ui/react`), not Radix
- **Client components:** Add `"use client"` directive when using hooks or browser APIs
- **IDs:** Use `nanoid()` for client-generated IDs (trip slugs, location IDs)
- **Coordinates:** Internally stored as `{ lat, lon }`. OSRM uses `lon,lat` order — the helpers handle conversion
- **Map loading:** Leaflet needs `window` — use `next/dynamic` with `ssr: false` (see `map-view.tsx`)

## External Service Gotchas

- **Nominatim:** Max 1 request/second. Scoped to Vietnam (`countrycodes=vn`). Free, but must include User-Agent.
- **OSRM:** Public demo server — no SLA, no auth. For production: self-host or use a commercial provider.
- **Supabase free tier:** 500MB database, 2GB bandwidth/month, 50K monthly active users.
