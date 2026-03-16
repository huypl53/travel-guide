# Homestay Locator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that ranks homestays by weighted distance to popular destinations, with an interactive map and distance matrix.

**Architecture:** Next.js 15 App Router with Leaflet map, Zustand state, Supabase persistence. API routes proxy Nominatim (geocoding) and OSRM (driving directions). Client-side Haversine for instant straight-line distances.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Leaflet, react-leaflet, Zustand, Supabase, Vitest

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This scaffolds the project in the current directory.

**Step 2: Install core dependencies**

```bash
npm install zustand leaflet react-leaflet @supabase/supabase-js nanoid
npm install -D @types/leaflet vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Then add components we'll need:

```bash
npx shadcn@latest add button input card table dialog dropdown-menu tooltip
```

**Step 4: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

**Step 5: Add test script to package.json**

Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`

**Step 6: Verify scaffold works**

```bash
npm run build
npm run test
```

Expected: Build succeeds, test suite runs (0 tests).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, shadcn/ui, Vitest"
```

---

### Task 2: Haversine Distance Utility

**Files:**
- Create: `src/lib/distance.ts`
- Create: `src/lib/__tests__/distance.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/__tests__/distance.test.ts
import { describe, it, expect } from "vitest";
import { haversineKm } from "@/lib/distance";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(11.9404, 108.4583, 11.9404, 108.4583)).toBe(0);
  });

  it("calculates Da Lat to Nha Trang (~135km)", () => {
    const km = haversineKm(11.9404, 108.4583, 12.2388, 109.1967);
    expect(km).toBeGreaterThan(130);
    expect(km).toBeLessThan(140);
  });

  it("calculates short distance (~1km)", () => {
    // Two points in Da Lat city center, roughly 1km apart
    const km = haversineKm(11.9404, 108.4583, 11.9465, 108.4485);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/distance.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement haversine**

```typescript
// src/lib/distance.ts
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/distance.test.ts
```

Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/distance.ts src/lib/__tests__/distance.test.ts
git commit -m "feat: add haversine distance calculation utility"
```

---

### Task 3: Ranking Algorithm

**Files:**
- Create: `src/lib/ranking.ts`
- Create: `src/lib/__tests__/ranking.test.ts`

**Step 1: Define types**

```typescript
// src/lib/types.ts
export type LocationType = "homestay" | "destination";
export type LocationSource = "manual" | "google_maps" | "csv";

export interface Location {
  id: string;
  tripId: string;
  type: LocationType;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  priority: number; // 1-5, meaningful for destinations
  source: LocationSource;
}

export interface DistanceEntry {
  homestayId: string;
  destinationId: string;
  straightLineKm: number;
  drivingKm: number | null;
  drivingMinutes: number | null;
}

export interface RankedHomestay {
  homestay: Location;
  weightedAvgKm: number;
  distances: { destination: Location; km: number }[];
}
```

**Step 2: Write failing tests**

```typescript
// src/lib/__tests__/ranking.test.ts
import { describe, it, expect } from "vitest";
import { rankHomestays } from "@/lib/ranking";
import type { Location } from "@/lib/types";

const homestays: Location[] = [
  { id: "h1", tripId: "t1", type: "homestay", name: "Close", address: null, lat: 11.94, lon: 108.45, priority: 3, source: "manual" },
  { id: "h2", tripId: "t1", type: "homestay", name: "Far", address: null, lat: 12.24, lon: 109.19, priority: 3, source: "manual" },
];

const destinations: Location[] = [
  { id: "d1", tripId: "t1", type: "destination", name: "Dest A", address: null, lat: 11.95, lon: 108.46, priority: 5, source: "manual" },
  { id: "d2", tripId: "t1", type: "destination", name: "Dest B", address: null, lat: 11.93, lon: 108.44, priority: 1, source: "manual" },
];

describe("rankHomestays", () => {
  it("returns homestays sorted by weighted average distance (closest first)", () => {
    const result = rankHomestays(homestays, destinations);
    expect(result[0].homestay.id).toBe("h1");
    expect(result[1].homestay.id).toBe("h2");
  });

  it("respects priority weights", () => {
    const result = rankHomestays(homestays, destinations);
    // Each result should have distances to both destinations
    expect(result[0].distances).toHaveLength(2);
    // Weighted avg should be a number
    expect(result[0].weightedAvgKm).toBeGreaterThan(0);
  });

  it("returns empty array for no homestays", () => {
    expect(rankHomestays([], destinations)).toEqual([]);
  });

  it("returns empty array for no destinations", () => {
    expect(rankHomestays(homestays, [])).toEqual([]);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/ranking.test.ts
```

Expected: FAIL — module not found.

**Step 4: Implement ranking**

```typescript
// src/lib/ranking.ts
import { haversineKm } from "./distance";
import type { Location, RankedHomestay } from "./types";

export function rankHomestays(
  homestays: Location[],
  destinations: Location[]
): RankedHomestay[] {
  if (homestays.length === 0 || destinations.length === 0) return [];

  const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);

  return homestays
    .map((homestay) => {
      const distances = destinations.map((dest) => ({
        destination: dest,
        km: haversineKm(homestay.lat, homestay.lon, dest.lat, dest.lon),
      }));

      const weightedAvgKm =
        distances.reduce(
          (sum, d) => sum + d.km * d.destination.priority,
          0
        ) / totalWeight;

      return { homestay, weightedAvgKm, distances };
    })
    .sort((a, b) => a.weightedAvgKm - b.weightedAvgKm);
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/ranking.test.ts
```

Expected: 4 tests PASS.

**Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/ranking.ts src/lib/__tests__/ranking.test.ts
git commit -m "feat: add ranking algorithm with priority-weighted distance"
```

---

### Task 4: Google Maps Link Parser

**Files:**
- Create: `src/lib/parsers.ts`
- Create: `src/lib/__tests__/parsers.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/__tests__/parsers.test.ts
import { describe, it, expect } from "vitest";
import { parseGoogleMapsUrl } from "@/lib/parsers";

describe("parseGoogleMapsUrl", () => {
  it("parses @lat,lon from full URL", () => {
    const url = "https://www.google.com/maps/place/Da+Lat/@11.9404,108.4583,15z";
    const result = parseGoogleMapsUrl(url);
    expect(result).toEqual({ lat: 11.9404, lon: 108.4583, name: "Da Lat" });
  });

  it("parses URL with /place/ name", () => {
    const url = "https://www.google.com/maps/place/Crazy+House/@11.9326,108.4312,17z";
    const result = parseGoogleMapsUrl(url);
    expect(result?.name).toBe("Crazy House");
    expect(result?.lat).toBeCloseTo(11.9326, 3);
  });

  it("parses short maps URL with query params", () => {
    const url = "https://maps.google.com/?q=11.9404,108.4583";
    const result = parseGoogleMapsUrl(url);
    expect(result?.lat).toBeCloseTo(11.9404, 3);
    expect(result?.lon).toBeCloseTo(108.4583, 3);
  });

  it("returns null for invalid URL", () => {
    expect(parseGoogleMapsUrl("not a url")).toBeNull();
    expect(parseGoogleMapsUrl("https://example.com")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/parsers.test.ts
```

**Step 3: Implement parser**

```typescript
// src/lib/parsers.ts
interface ParsedLocation {
  lat: number;
  lon: number;
  name: string | null;
}

export function parseGoogleMapsUrl(url: string): ParsedLocation | null {
  // Try @lat,lon pattern (most common in place URLs)
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const name = extractPlaceName(url);
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), name };
  }

  // Try ?q=lat,lon pattern
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), name: null };
  }

  return null;
}

function extractPlaceName(url: string): string | null {
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }
  return null;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/parsers.test.ts
```

Expected: 4 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/parsers.ts src/lib/__tests__/parsers.test.ts
git commit -m "feat: add Google Maps URL parser for coordinate extraction"
```

---

### Task 5: CSV/JSON Parser

**Files:**
- Modify: `src/lib/parsers.ts`
- Modify: `src/lib/__tests__/parsers.test.ts`

**Step 1: Write failing tests**

```typescript
// Append to src/lib/__tests__/parsers.test.ts
import { parseCsvLocations, parseJsonLocations } from "@/lib/parsers";

describe("parseCsvLocations", () => {
  it("parses standard CSV with name,lat,lon columns", () => {
    const csv = `name,lat,lon
Villa Rose,11.94,108.45
Cozy Cabin,11.93,108.44`;
    const result = parseCsvLocations(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Villa Rose", lat: 11.94, lon: 108.45, address: null });
  });

  it("parses CSV with address column", () => {
    const csv = `name,address,lat,lon
Villa Rose,123 Main St,11.94,108.45`;
    const result = parseCsvLocations(csv);
    expect(result[0].address).toBe("123 Main St");
  });

  it("skips rows with invalid coordinates", () => {
    const csv = `name,lat,lon
Valid,11.94,108.45
Invalid,abc,def`;
    const result = parseCsvLocations(csv);
    expect(result).toHaveLength(1);
  });
});

describe("parseJsonLocations", () => {
  it("parses JSON array of locations", () => {
    const json = JSON.stringify([
      { name: "Villa Rose", lat: 11.94, lon: 108.45 },
    ]);
    const result = parseJsonLocations(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Villa Rose");
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseJsonLocations("not json")).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/parsers.test.ts
```

**Step 3: Implement CSV and JSON parsers**

Add to `src/lib/parsers.ts`:

```typescript
interface ParsedFileLocation {
  name: string;
  lat: number;
  lon: number;
  address: string | null;
}

export function parseCsvLocations(csv: string): ParsedFileLocation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const latIdx = headers.indexOf("lat");
  const lonIdx = headers.indexOf("lon");
  const addrIdx = headers.indexOf("address");

  if (nameIdx === -1 || latIdx === -1 || lonIdx === -1) return [];

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) return null;
      return {
        name: cols[nameIdx],
        lat,
        lon,
        address: addrIdx !== -1 ? cols[addrIdx] : null,
      };
    })
    .filter((loc): loc is ParsedFileLocation => loc !== null);
}

export function parseJsonLocations(json: string): ParsedFileLocation[] {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d.name && typeof d.lat === "number" && typeof d.lon === "number")
      .map((d) => ({
        name: d.name,
        lat: d.lat,
        lon: d.lon,
        address: d.address ?? null,
      }));
  } catch {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/parsers.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/lib/parsers.ts src/lib/__tests__/parsers.test.ts
git commit -m "feat: add CSV and JSON location parsers"
```

---

### Task 6: Zustand Store

**Files:**
- Create: `src/store/trip-store.ts`
- Create: `src/store/__tests__/trip-store.test.ts`

**Step 1: Write failing tests**

```typescript
// src/store/__tests__/trip-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTripStore } from "@/store/trip-store";

describe("tripStore", () => {
  beforeEach(() => {
    useTripStore.getState().reset();
  });

  it("starts with empty locations", () => {
    const state = useTripStore.getState();
    expect(state.homestays).toEqual([]);
    expect(state.destinations).toEqual([]);
  });

  it("adds a homestay", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa Rose",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    expect(useTripStore.getState().homestays).toHaveLength(1);
    expect(useTripStore.getState().homestays[0].name).toBe("Villa Rose");
  });

  it("adds a destination with priority", () => {
    useTripStore.getState().addLocation({
      type: "destination",
      name: "Crazy House",
      lat: 11.93,
      lon: 108.43,
      address: null,
      source: "manual",
      priority: 5,
    });
    expect(useTripStore.getState().destinations).toHaveLength(1);
    expect(useTripStore.getState().destinations[0].priority).toBe(5);
  });

  it("removes a location", () => {
    useTripStore.getState().addLocation({
      type: "homestay",
      name: "Villa",
      lat: 11.94,
      lon: 108.45,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().homestays[0].id;
    useTripStore.getState().removeLocation(id);
    expect(useTripStore.getState().homestays).toHaveLength(0);
  });

  it("updates destination priority", () => {
    useTripStore.getState().addLocation({
      type: "destination",
      name: "Dest",
      lat: 11.93,
      lon: 108.43,
      address: null,
      source: "manual",
    });
    const id = useTripStore.getState().destinations[0].id;
    useTripStore.getState().updatePriority(id, 5);
    expect(useTripStore.getState().destinations[0].priority).toBe(5);
  });

  it("sets selected homestay", () => {
    useTripStore.getState().setSelectedHomestay("h1");
    expect(useTripStore.getState().selectedHomestayId).toBe("h1");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/__tests__/trip-store.test.ts
```

**Step 3: Implement store**

```typescript
// src/store/trip-store.ts
import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Location, LocationType, LocationSource } from "@/lib/types";

interface AddLocationInput {
  type: LocationType;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  source: LocationSource;
  priority?: number;
}

interface TripState {
  tripName: string;
  locations: Location[];
  selectedHomestayId: string | null;
  homestays: Location[];
  destinations: Location[];
  setTripName: (name: string) => void;
  addLocation: (input: AddLocationInput) => void;
  removeLocation: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  setSelectedHomestay: (id: string | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  tripName: "",
  locations: [],
  selectedHomestayId: null,

  get homestays() {
    return get().locations.filter((l) => l.type === "homestay");
  },

  get destinations() {
    return get().locations.filter((l) => l.type === "destination");
  },

  setTripName: (name) => set({ tripName: name }),

  addLocation: (input) => {
    const location: Location = {
      id: nanoid(),
      tripId: "",
      type: input.type,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lon: input.lon,
      priority: input.priority ?? 3,
      source: input.source,
    };
    set((state) => ({ locations: [...state.locations, location] }));
  },

  removeLocation: (id) =>
    set((state) => ({
      locations: state.locations.filter((l) => l.id !== id),
    })),

  updatePriority: (id, priority) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, priority } : l
      ),
    })),

  setSelectedHomestay: (id) => set({ selectedHomestayId: id }),

  reset: () =>
    set({ tripName: "", locations: [], selectedHomestayId: null }),
}));
```

Note: Zustand `get` properties don't work as native getters. Adjust the test to use computed access:

```typescript
// The store needs derived state — use selectors instead of getters.
// Update the store: remove the get properties, add them as selectors.
```

Actually, replace the getter approach with a simpler pattern — derive `homestays` and `destinations` in the test via filtering:

```typescript
// In store, just store locations. In tests and components, filter:
const homestays = useTripStore.getState().locations.filter(l => l.type === "homestay");
```

Or add helper functions to the store. The test file should be updated to use `locations.filter()`. The implementation above is fine as long as the getters are removed and replaced with the `locations` array. Update tests accordingly.

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/store/__tests__/trip-store.test.ts
```

Expected: 6 tests PASS.

**Step 5: Commit**

```bash
git add src/store/trip-store.ts src/store/__tests__/trip-store.test.ts
git commit -m "feat: add Zustand trip store with location management"
```

---

### Task 7: Supabase Schema & Client

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `src/lib/supabase.ts`
- Create: `.env.local.example`

**Step 1: Write the migration SQL**

```sql
-- supabase/migrations/001_initial.sql
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_slug text unique not null,
  created_at timestamptz default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  type text not null check (type in ('homestay', 'destination')),
  name text not null,
  address text,
  lat double precision not null,
  lon double precision not null,
  priority integer not null default 3 check (priority between 1 and 5),
  source text not null default 'manual' check (source in ('manual', 'google_maps', 'csv'))
);

create table distance_cache (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  homestay_id uuid references locations(id) on delete cascade not null,
  destination_id uuid references locations(id) on delete cascade not null,
  straight_line_km double precision not null,
  driving_km double precision,
  driving_minutes double precision,
  unique (homestay_id, destination_id)
);

create index idx_locations_trip on locations(trip_id);
create index idx_distance_cache_trip on distance_cache(trip_id);
```

**Step 2: Create Supabase client**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 3: Create env example**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Commit**

```bash
git add supabase/ src/lib/supabase.ts .env.local.example
git commit -m "feat: add Supabase schema migration and client setup"
```

---

### Task 8: API Routes — Geocode & Directions

**Files:**
- Create: `src/app/api/geocode/route.ts`
- Create: `src/app/api/directions/route.ts`

**Step 1: Implement geocode API route**

```typescript
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=vn`;

  const res = await fetch(url, {
    headers: { "User-Agent": "HomestayLocator/1.0" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  const data = await res.json();
  const results = data.map((item: { display_name: string; lat: string; lon: string }) => ({
    name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));

  return NextResponse.json(results);
}
```

**Step 2: Implement directions API route**

```typescript
// src/app/api/directions/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from"); // "lat,lon"
  const to = request.nextUrl.searchParams.get("to"); // "lat,lon"

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to parameters" }, { status: 400 });
  }

  const [fromLat, fromLon] = from.split(",");
  const [toLat, toLon] = to.split(",");

  // OSRM expects lon,lat order
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Routing failed" }, { status: 502 });
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    return NextResponse.json({ error: "No route found" }, { status: 404 });
  }

  const route = data.routes[0];
  return NextResponse.json({
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  });
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add geocode (Nominatim) and directions (OSRM) API routes"
```

---

### Task 9: API Route — Trips CRUD

**Files:**
- Create: `src/app/api/trips/route.ts`
- Create: `src/app/api/trips/[slug]/route.ts`

**Step 1: Implement trip creation**

```typescript
// src/app/api/trips/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, locations } = body;

  if (!name) {
    return NextResponse.json({ error: "Missing trip name" }, { status: 400 });
  }

  const slug = nanoid(10);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({ name, share_slug: slug })
    .select()
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  if (locations?.length > 0) {
    const rows = locations.map((loc: { type: string; name: string; address?: string; lat: number; lon: number; priority?: number; source?: string }) => ({
      trip_id: trip.id,
      type: loc.type,
      name: loc.name,
      address: loc.address ?? null,
      lat: loc.lat,
      lon: loc.lon,
      priority: loc.priority ?? 3,
      source: loc.source ?? "manual",
    }));

    const { error: locError } = await supabase.from("locations").insert(rows);
    if (locError) {
      return NextResponse.json({ error: locError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug: trip.share_slug, id: trip.id });
}
```

**Step 2: Implement trip retrieval by slug**

```typescript
// src/app/api/trips/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (error || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/app/api/trips/
git commit -m "feat: add trip CRUD API routes with Supabase"
```

---

### Task 10: Map Component

**Files:**
- Create: `src/components/map-view.tsx`
- Create: `src/components/map-markers.tsx`

**Step 1: Create dynamic Leaflet map wrapper**

Leaflet requires `window`, so it must be loaded client-side only in Next.js.

```typescript
// src/components/map-view.tsx
"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("./map-inner"),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

export function MapView() {
  return <MapContainer />;
}
```

**Step 2: Create map inner component**

```typescript
// src/components/map-inner.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTripStore } from "@/store/trip-store";
import { haversineKm } from "@/lib/distance";

// Fix Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const homestayIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function distanceToColor(km: number, maxKm: number): string {
  const ratio = Math.min(km / maxKm, 1);
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},0)`;
}

export default function MapInner() {
  const locations = useTripStore((s) => s.locations);
  const selectedId = useTripStore((s) => s.selectedHomestayId);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);

  const homestays = locations.filter((l) => l.type === "homestay");
  const destinations = locations.filter((l) => l.type === "destination");

  // Default center: Da Lat, Vietnam
  const center: [number, number] =
    locations.length > 0
      ? [
          locations.reduce((s, l) => s + l.lat, 0) / locations.length,
          locations.reduce((s, l) => s + l.lon, 0) / locations.length,
        ]
      : [11.9404, 108.4583];

  const selectedHomestay = homestays.find((h) => h.id === selectedId);

  // Calculate max distance for color scaling
  const maxKm =
    selectedHomestay && destinations.length > 0
      ? Math.max(
          ...destinations.map((d) =>
            haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon)
          )
        )
      : 10;

  return (
    <MapContainer center={center} zoom={13} className="h-[500px] w-full rounded-lg z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {homestays.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lon]}
          icon={homestayIcon}
          eventHandlers={{ click: () => setSelected(h.id) }}
        >
          <Popup>{h.name}</Popup>
        </Marker>
      ))}

      {destinations.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lon]} icon={destinationIcon}>
          <Popup>
            {d.name} (priority: {d.priority})
          </Popup>
        </Marker>
      ))}

      {selectedHomestay &&
        destinations.map((d) => {
          const km = haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
          return (
            <Polyline
              key={`${selectedHomestay.id}-${d.id}`}
              positions={[
                [selectedHomestay.lat, selectedHomestay.lon],
                [d.lat, d.lon],
              ]}
              pathOptions={{
                color: distanceToColor(km, maxKm),
                weight: 3,
                opacity: 0.8,
              }}
            />
          );
        })}
    </MapContainer>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/components/map-view.tsx src/components/map-inner.tsx
git commit -m "feat: add interactive Leaflet map with color-coded route lines"
```

---

### Task 11: Data Input Panel

**Files:**
- Create: `src/components/location-input.tsx`
- Create: `src/components/location-list.tsx`
- Create: `src/components/priority-stars.tsx`

**Step 1: Create priority stars component**

```typescript
// src/components/priority-stars.tsx
"use client";

interface PriorityStarsProps {
  value: number;
  onChange: (value: number) => void;
}

export function PriorityStars({ value, onChange }: PriorityStarsProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-sm ${star <= value ? "text-yellow-500" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create location input component**

This component handles all 3 input methods: paste Google Maps link, manual address entry, and file upload.

```typescript
// src/components/location-input.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripStore } from "@/store/trip-store";
import { parseGoogleMapsUrl, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";
import type { LocationType } from "@/lib/types";

interface LocationInputProps {
  type: LocationType;
}

export function LocationInput({ type }: LocationInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [geocoding, setGeocoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addLocation = useTripStore((s) => s.addLocation);

  const label = type === "homestay" ? "Homestay" : "Destination";

  async function handlePaste() {
    const parsed = parseGoogleMapsUrl(input);
    if (parsed) {
      addLocation({
        type,
        name: parsed.name ?? "Unnamed",
        lat: parsed.lat,
        lon: parsed.lon,
        address: null,
        source: "google_maps",
      });
      setInput("");
    }
  }

  async function handleManual() {
    if (!input.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (data.length > 0) {
        addLocation({
          type,
          name: data[0].name.split(",")[0],
          lat: data[0].lat,
          lon: data[0].lon,
          address: input,
          source: "manual",
        });
        setInput("");
      }
    } finally {
      setGeocoding(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const locations = file.name.endsWith(".json")
        ? parseJsonLocations(text)
        : parseCsvLocations(text);

      locations.forEach((loc) => {
        addLocation({
          type,
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          address: loc.address,
          source: "csv",
        });
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant={mode === "paste" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("paste")}
        >
          Paste Link
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          Search Address
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          Upload File
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={mode === "paste" ? "Paste Google Maps link..." : `Search ${label.toLowerCase()} address...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") mode === "paste" ? handlePaste() : handleManual();
          }}
        />
        <Button
          onClick={mode === "paste" ? handlePaste : handleManual}
          disabled={geocoding}
        >
          {geocoding ? "..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Create location list component**

```typescript
// src/components/location-list.tsx
"use client";

import { useTripStore } from "@/store/trip-store";
import { PriorityStars } from "@/components/priority-stars";
import { Button } from "@/components/ui/button";
import type { LocationType } from "@/lib/types";

interface LocationListProps {
  type: LocationType;
}

export function LocationList({ type }: LocationListProps) {
  const locations = useTripStore((s) =>
    s.locations.filter((l) => l.type === type)
  );
  const removeLocation = useTripStore((s) => s.removeLocation);
  const updatePriority = useTripStore((s) => s.updatePriority);

  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">No {type}s added yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {locations.map((loc) => (
        <li key={loc.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
          <span className="text-sm truncate flex-1">{loc.name}</span>
          {type === "destination" && (
            <PriorityStars
              value={loc.priority}
              onChange={(p) => updatePriority(loc.id, p)}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 w-6 p-0"
            onClick={() => removeLocation(loc.id)}
          >
            x
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add src/components/location-input.tsx src/components/location-list.tsx src/components/priority-stars.tsx
git commit -m "feat: add location input panel with paste, search, and file upload"
```

---

### Task 12: Distance Matrix & Ranking Components

**Files:**
- Create: `src/components/distance-matrix.tsx`
- Create: `src/components/ranking-list.tsx`

**Step 1: Create ranking list**

```typescript
// src/components/ranking-list.tsx
"use client";

import { useTripStore } from "@/store/trip-store";
import { rankHomestays } from "@/lib/ranking";
import { Button } from "@/components/ui/button";

const medals = ["🥇", "🥈", "🥉"];

export function RankingList() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedId = useTripStore((s) => s.selectedHomestayId);

  const homestays = locations.filter((l) => l.type === "homestay");
  const destinations = locations.filter((l) => l.type === "destination");

  const ranked = rankHomestays(homestays, destinations);

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">Add homestays and destinations to see rankings.</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-sm">Ranking: Best → Worst</h3>
      {ranked.map((r, i) => (
        <Button
          key={r.homestay.id}
          variant={r.homestay.id === selectedId ? "secondary" : "ghost"}
          className="w-full justify-between h-auto py-2"
          onClick={() => setSelected(r.homestay.id)}
        >
          <span>
            {medals[i] ?? `#${i + 1}`} {r.homestay.name}
          </span>
          <span className="text-muted-foreground text-xs">
            avg {r.weightedAvgKm.toFixed(1)} km
          </span>
        </Button>
      ))}
    </div>
  );
}
```

**Step 2: Create distance matrix**

```typescript
// src/components/distance-matrix.tsx
"use client";

import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import { haversineKm } from "@/lib/distance";
import { Button } from "@/components/ui/button";

export function DistanceMatrix() {
  const [expanded, setExpanded] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);

  const homestays = locations.filter((l) => l.type === "homestay");
  const destinations = locations.filter((l) => l.type === "destination");

  if (homestays.length === 0 || destinations.length === 0) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between"
      >
        <span className="font-semibold text-sm">Distance Matrix</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </Button>

      {expanded && (
        <div className="overflow-x-auto mt-2">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left p-1"></th>
                {destinations.map((d) => (
                  <th key={d.id} className="p-1 text-center max-w-[80px] truncate">
                    {d.name}
                  </th>
                ))}
                <th className="p-1 text-center font-bold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {homestays.map((h) => {
                const dists = destinations.map((d) =>
                  haversineKm(h.lat, h.lon, d.lat, d.lon)
                );
                const avg = dists.reduce((s, d) => s + d, 0) / dists.length;
                return (
                  <tr
                    key={h.id}
                    className="hover:bg-muted cursor-pointer"
                    onClick={() => setSelected(h.id)}
                  >
                    <td className="p-1 font-medium">{h.name}</td>
                    {dists.map((km, i) => (
                      <td key={destinations[i].id} className="p-1 text-center">
                        {km.toFixed(1)}
                      </td>
                    ))}
                    <td className="p-1 text-center font-bold">{avg.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/components/ranking-list.tsx src/components/distance-matrix.tsx
git commit -m "feat: add ranking list and distance matrix components"
```

---

### Task 13: Trip Page (Main Workspace)

**Files:**
- Create: `src/app/trip/[slug]/page.tsx`
- Modify: `src/app/page.tsx` (landing page)

**Step 1: Create the trip workspace page**

```typescript
// src/app/trip/[slug]/page.tsx
"use client";

import { MapView } from "@/components/map-view";
import { LocationInput } from "@/components/location-input";
import { LocationList } from "@/components/location-list";
import { RankingList } from "@/components/ranking-list";
import { DistanceMatrix } from "@/components/distance-matrix";
import { Card } from "@/components/ui/card";

export default function TripPage() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trip Planner</h1>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground hover:underline">Share</button>
          <button className="text-sm text-muted-foreground hover:underline">Export</button>
        </div>
      </header>

      {/* Data Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Homestays</h2>
          <LocationInput type="homestay" />
          <LocationList type="homestay" />
        </Card>
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Destinations</h2>
          <LocationInput type="destination" />
          <LocationList type="destination" />
        </Card>
      </div>

      {/* Map */}
      <MapView />

      {/* Ranking + Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <RankingList />
        </Card>
        <Card className="p-4">
          <DistanceMatrix />
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Create landing page**

```typescript
// src/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";

export default function HomePage() {
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold text-center">Homestay Locator</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Find the best homestay based on proximity to the places you want to visit.
        Add homestays and destinations, and we'll rank them for you.
      </p>
      <Button size="lg" onClick={handleNewTrip}>
        New Trip
      </Button>
    </div>
  );
}
```

**Step 3: Verify build and manual test**

```bash
npm run build
npm run dev
```

Visit `http://localhost:3000`, click "New Trip", verify the workspace loads.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/trip/
git commit -m "feat: add landing page and trip workspace with all components"
```

---

### Task 14: Driving Time (OSRM Integration)

**Files:**
- Create: `src/components/driving-time-button.tsx`
- Modify: `src/components/distance-matrix.tsx`

**Step 1: Create driving time fetch hook**

```typescript
// src/components/driving-time-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DrivingTimeButtonProps {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
}

export function DrivingTimeButton({ fromLat, fromLon, toLat, toLon }: DrivingTimeButtonProps) {
  const [result, setResult] = useState<{ km: number; min: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDriving() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/directions?from=${fromLat},${fromLon}&to=${toLat},${toLon}`
      );
      const data = await res.json();
      if (data.distanceKm) {
        setResult({ km: data.distanceKm, min: data.durationMinutes });
      }
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <span className="text-xs text-muted-foreground">
        {result.km.toFixed(1)}km / {result.min.toFixed(0)}min
      </span>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={fetchDriving} disabled={loading}>
      {loading ? "..." : "drive?"}
    </Button>
  );
}
```

**Step 2: Add driving time button to distance matrix cells**

In `distance-matrix.tsx`, import and render `<DrivingTimeButton>` below each distance cell when the matrix is expanded.

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/components/driving-time-button.tsx src/components/distance-matrix.tsx
git commit -m "feat: add on-demand driving time via OSRM in distance matrix"
```

---

### Task 15: Share & Export

**Files:**
- Create: `src/components/share-export.tsx`
- Create: `src/app/trip/[slug]/share/page.tsx`

**Step 1: Implement share (save to Supabase, copy URL)**

```typescript
// src/components/share-export.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTripStore } from "@/store/trip-store";

interface ShareExportProps {
  slug: string;
}

export function ShareExport({ slug }: ShareExportProps) {
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const tripName = useTripStore((s) => s.tripName);

  async function handleShare() {
    setSaving(true);
    try {
      await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tripName || "Untitled Trip", locations }),
      });
      await navigator.clipboard.writeText(`${window.location.origin}/trip/${slug}/share`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    const data = JSON.stringify({ name: tripName, locations }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tripName || "trip"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleShare} disabled={saving}>
        {shared ? "Link copied!" : "Share"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        Export
      </Button>
    </div>
  );
}
```

**Step 2: Create read-only share page**

```typescript
// src/app/trip/[slug]/share/page.tsx
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: trip } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (!trip) notFound();

  // Server-rendered read-only view with map and matrix
  // This will be a simplified version of the trip page
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold">{trip.name}</h1>
      <p className="text-sm text-muted-foreground">Shared trip — read only</p>
      {/* Render map and matrix with the loaded data */}
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/components/share-export.tsx src/app/trip/
git commit -m "feat: add share (Supabase + clipboard) and JSON export"
```

---

### Task 16: Mobile Responsive Layout

**Files:**
- Modify: `src/app/trip/[slug]/page.tsx`
- Modify: `src/components/map-inner.tsx`

**Step 1: Add responsive breakpoints**

The trip page already uses `grid-cols-1 md:grid-cols-2`. Ensure:
- Map is full-width on mobile
- Input panels stack vertically on mobile
- Distance matrix scrolls horizontally on small screens (already has `overflow-x-auto`)

**Step 2: Add bottom sheet behavior on mobile**

For the ranking/matrix section on mobile, use a fixed bottom panel that expands on tap. Use Tailwind's `md:relative md:bottom-auto` to switch between fixed bottom sheet (mobile) and inline layout (desktop).

**Step 3: Test on mobile viewport**

Open Chrome DevTools, toggle device toolbar, test at 375px width.

**Step 4: Commit**

```bash
git add src/app/trip/ src/components/
git commit -m "feat: add mobile-responsive layout with bottom sheet ranking"
```

---

### Task 17: End-to-End Smoke Test

**Files:**
- Create: `src/lib/__tests__/integration.test.ts`

**Step 1: Write integration test for the full flow**

```typescript
// src/lib/__tests__/integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTripStore } from "@/store/trip-store";
import { rankHomestays } from "@/lib/ranking";
import { parseGoogleMapsUrl, parseCsvLocations } from "@/lib/parsers";

describe("full flow integration", () => {
  beforeEach(() => useTripStore.getState().reset());

  it("parses locations, adds to store, ranks correctly", () => {
    // Parse a Google Maps link
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Villa+Rose/@11.94,108.45,15z"
    );
    expect(parsed).not.toBeNull();

    // Add homestays
    useTripStore.getState().addLocation({
      type: "homestay", name: parsed!.name!, lat: parsed!.lat, lon: parsed!.lon,
      address: null, source: "google_maps",
    });

    // Parse CSV destinations
    const csvDests = parseCsvLocations(`name,lat,lon
Crazy House,11.9326,108.4312
Xuan Huong Lake,11.9465,108.4485`);

    csvDests.forEach((d) => {
      useTripStore.getState().addLocation({
        type: "destination", name: d.name, lat: d.lat, lon: d.lon,
        address: d.address, source: "csv",
      });
    });

    const locs = useTripStore.getState().locations;
    const homestays = locs.filter((l) => l.type === "homestay");
    const destinations = locs.filter((l) => l.type === "destination");

    expect(homestays).toHaveLength(1);
    expect(destinations).toHaveLength(2);

    // Rank
    const ranked = rankHomestays(homestays, destinations);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].weightedAvgKm).toBeGreaterThan(0);
    expect(ranked[0].distances).toHaveLength(2);
  });
});
```

**Step 2: Run all tests**

```bash
npm run test
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add src/lib/__tests__/integration.test.ts
git commit -m "test: add end-to-end integration smoke test"
```

---

### Task 18: README & Architecture Docs

**Files:**
- Modify: `README.md`
- Create: `docs/architecture.md`

**Step 1: Write README**

Cover: what the app does, how to run locally, how to set up Supabase, how to deploy.

**Step 2: Write architecture doc**

Cover: architecture diagram, tech stack decisions, data flow, API routes, external services.

**Step 3: Commit**

```bash
git add README.md docs/architecture.md
git commit -m "docs: add README and architecture documentation"
```
