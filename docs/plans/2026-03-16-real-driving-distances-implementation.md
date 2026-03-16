# Real Driving Distances Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace haversine-based ranking with real OSRM driving distances, using the Table API for bulk fetching and individual routes for polylines on-demand.

**Architecture:** New `/api/distances` route wraps OSRM Table API. New `distance-store` (Zustand) holds driving distances. `rankHomestays` accepts optional driving distances map, falling back to haversine. A `useAutoFetchDistances` hook triggers fetches when locations change.

**Tech Stack:** Next.js API routes, OSRM Table API, Zustand, Vitest, React

---

### Task 1: OSRM Table API Route

**Files:**
- Create: `src/app/api/distances/route.ts`
- Test: `src/lib/__tests__/distances-api.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/distances-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the parsing/formatting logic extracted into a helper
import { buildOsrmTableUrl, parseTableResponse } from "@/lib/osrm";

describe("buildOsrmTableUrl", () => {
  it("builds correct OSRM table URL with sources and destinations", () => {
    const sources = [{ lat: 11.94, lon: 108.45 }, { lat: 12.0, lon: 108.5 }];
    const destinations = [{ lat: 11.95, lon: 108.46 }];
    const url = buildOsrmTableUrl(sources, destinations);

    // OSRM expects lon,lat order; sources first, then destinations
    expect(url).toContain("108.45,11.94;108.5,12;108.46,11.95");
    expect(url).toContain("sources=0;1");
    expect(url).toContain("destinations=2");
    expect(url).toContain("annotations=distance,duration");
  });
});

describe("parseTableResponse", () => {
  it("parses OSRM table response into distance matrix", () => {
    const response = {
      code: "Ok",
      distances: [[1500, 3000], [2000, 4000]], // meters
      durations: [[120, 240], [180, 360]],       // seconds
    };
    const result = parseTableResponse(response, 2, 2);

    expect(result).toHaveLength(2); // 2 sources
    expect(result[0]).toHaveLength(2); // 2 destinations each
    expect(result[0][0]).toEqual({ distanceKm: 1.5, durationMinutes: 2 });
    expect(result[1][1]).toEqual({ distanceKm: 4, durationMinutes: 6 });
  });

  it("returns null for null entries (no route)", () => {
    const response = {
      code: "Ok",
      distances: [[null]],
      durations: [[null]],
    };
    const result = parseTableResponse(response, 1, 1);
    expect(result[0][0]).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/distances-api.test.ts`
Expected: FAIL — module `@/lib/osrm` not found

**Step 3: Write the OSRM helper**

Create `src/lib/osrm.ts`:

```typescript
interface Coord {
  lat: number;
  lon: number;
}

export interface TableEntry {
  distanceKm: number;
  durationMinutes: number;
}

export function buildOsrmTableUrl(sources: Coord[], destinations: Coord[]): string {
  const allCoords = [...sources, ...destinations]
    .map((c) => `${c.lon},${c.lat}`)
    .join(";");

  const sourceIndices = sources.map((_, i) => i).join(";");
  const destIndices = destinations.map((_, i) => i + sources.length).join(";");

  return `https://router.project-osrm.org/table/v1/driving/${allCoords}?sources=${sourceIndices}&destinations=${destIndices}&annotations=distance,duration`;
}

export function parseTableResponse(
  response: { distances: (number | null)[][]; durations: (number | null)[][] },
  sourceCount: number,
  destCount: number
): (TableEntry | null)[][] {
  const result: (TableEntry | null)[][] = [];

  for (let s = 0; s < sourceCount; s++) {
    const row: (TableEntry | null)[] = [];
    for (let d = 0; d < destCount; d++) {
      const dist = response.distances[s][d];
      const dur = response.durations[s][d];
      if (dist === null || dur === null) {
        row.push(null);
      } else {
        row.push({
          distanceKm: dist / 1000,
          durationMinutes: dur / 60,
        });
      }
    }
    result.push(row);
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/distances-api.test.ts`
Expected: PASS

**Step 5: Write the API route**

Create `src/app/api/distances/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { buildOsrmTableUrl, parseTableResponse } from "@/lib/osrm";

export async function GET(request: NextRequest) {
  const sourcesParam = request.nextUrl.searchParams.get("sources"); // "lat,lon;lat,lon"
  const destsParam = request.nextUrl.searchParams.get("destinations");

  if (!sourcesParam || !destsParam) {
    return NextResponse.json({ error: "Missing sources/destinations" }, { status: 400 });
  }

  const sources = sourcesParam.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });

  const destinations = destsParam.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });

  const url = buildOsrmTableUrl(sources, destinations);

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "OSRM table request failed" }, { status: 502 });
  }

  const data = await res.json();
  if (data.code !== "Ok") {
    return NextResponse.json({ error: "OSRM error: " + data.code }, { status: 502 });
  }

  const matrix = parseTableResponse(data, sources.length, destinations.length);

  return NextResponse.json({ matrix });
}
```

**Step 6: Commit**

```bash
git add src/lib/osrm.ts src/lib/__tests__/distances-api.test.ts src/app/api/distances/route.ts
git commit -m "feat: add OSRM table API route and helpers for bulk distance fetching"
```

---

### Task 2: Distance Store

**Files:**
- Create: `src/store/distance-store.ts`
- Test: `src/lib/__tests__/distance-store.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/distance-store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDistanceStore } from "@/store/distance-store";
import type { Location } from "@/lib/types";

const homestays: Location[] = [
  { id: "h1", tripId: "t1", type: "homestay", name: "H1", address: null, lat: 11.94, lon: 108.45, priority: 3, source: "manual" },
];

const destinations: Location[] = [
  { id: "d1", tripId: "t1", type: "destination", name: "D1", address: null, lat: 11.95, lon: 108.46, priority: 5, source: "manual" },
];

beforeEach(() => {
  useDistanceStore.getState().clear();
});

describe("useDistanceStore", () => {
  it("starts with empty distances and loading false", () => {
    const state = useDistanceStore.getState();
    expect(state.distances.size).toBe(0);
    expect(state.loading).toBe(false);
  });

  it("fetchDistances populates the distances map", async () => {
    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        matrix: [[{ distanceKm: 5.2, durationMinutes: 12 }]],
      }),
    });

    await useDistanceStore.getState().fetchDistances(homestays, destinations);

    const state = useDistanceStore.getState();
    expect(state.distances.get("h1:d1")).toEqual({
      drivingKm: 5.2,
      drivingMinutes: 12,
    });
    expect(state.loading).toBe(false);
  });

  it("clear resets distances", async () => {
    useDistanceStore.setState({
      distances: new Map([["h1:d1", { drivingKm: 5, drivingMinutes: 10 }]]),
    });
    useDistanceStore.getState().clear();
    expect(useDistanceStore.getState().distances.size).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/distance-store.test.ts`
Expected: FAIL — module `@/store/distance-store` not found

**Step 3: Write the store**

Create `src/store/distance-store.ts`:

```typescript
import { create } from "zustand";
import type { Location } from "@/lib/types";

export interface DrivingDistance {
  drivingKm: number;
  drivingMinutes: number;
}

interface DistanceState {
  distances: Map<string, DrivingDistance>;
  loading: boolean;
  error: string | null;
  fetchDistances: (homestays: Location[], destinations: Location[]) => Promise<void>;
  clear: () => void;
}

export const useDistanceStore = create<DistanceState>((set) => ({
  distances: new Map(),
  loading: false,
  error: null,

  fetchDistances: async (homestays, destinations) => {
    if (homestays.length === 0 || destinations.length === 0) {
      set({ distances: new Map(), loading: false });
      return;
    }

    set({ loading: true, error: null });

    const sourcesParam = homestays.map((h) => `${h.lat},${h.lon}`).join(";");
    const destsParam = destinations.map((d) => `${d.lat},${d.lon}`).join(";");

    try {
      const res = await fetch(`/api/distances?sources=${sourcesParam}&destinations=${destsParam}`);
      if (!res.ok) throw new Error("Failed to fetch distances");

      const data = await res.json();
      const newDistances = new Map<string, DrivingDistance>();

      for (let s = 0; s < homestays.length; s++) {
        for (let d = 0; d < destinations.length; d++) {
          const entry = data.matrix[s][d];
          if (entry) {
            newDistances.set(`${homestays[s].id}:${destinations[d].id}`, {
              drivingKm: entry.distanceKm,
              drivingMinutes: entry.durationMinutes,
            });
          }
        }
      }

      set({ distances: newDistances, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  clear: () => set({ distances: new Map(), loading: false, error: null }),
}));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/distance-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store/distance-store.ts src/lib/__tests__/distance-store.test.ts
git commit -m "feat: add distance store for managing driving distances"
```

---

### Task 3: Update Ranking to Use Driving Distances

**Files:**
- Modify: `src/lib/ranking.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/__tests__/ranking.test.ts`

**Step 1: Update types**

In `src/lib/types.ts`, update `RankedHomestay`:

```typescript
export interface RankedHomestay {
  homestay: Location;
  weightedAvgKm: number;
  distances: {
    destination: Location;
    km: number;              // haversine (always present)
    drivingKm?: number;
    drivingMinutes?: number;
  }[];
}
```

**Step 2: Write failing tests for driving distance ranking**

Add to `src/lib/__tests__/ranking.test.ts`:

```typescript
import type { DrivingDistance } from "@/store/distance-store";

describe("rankHomestays with driving distances", () => {
  it("uses driving distances when provided", () => {
    const drivingDistances = new Map<string, DrivingDistance>([
      // h1 is closer by air but farther by road
      ["h1:d1", { drivingKm: 20, drivingMinutes: 30 }],
      ["h1:d2", { drivingKm: 18, drivingMinutes: 25 }],
      // h2 is farther by air but closer by road
      ["h2:d1", { drivingKm: 5, drivingMinutes: 8 }],
      ["h2:d2", { drivingKm: 6, drivingMinutes: 10 }],
    ]);

    const result = rankHomestays(homestays, destinations, drivingDistances);
    // h2 should now rank first (closer by road)
    expect(result[0].homestay.id).toBe("h2");
    expect(result[1].homestay.id).toBe("h1");
  });

  it("falls back to haversine when driving distance is missing", () => {
    const partial = new Map<string, DrivingDistance>([
      ["h1:d1", { drivingKm: 1, drivingMinutes: 2 }],
      // h1:d2 missing, h2:* missing — will use haversine
    ]);

    const result = rankHomestays(homestays, destinations, partial);
    // Should not throw, should produce valid ranking
    expect(result).toHaveLength(2);
    expect(result[0].weightedAvgKm).toBeGreaterThan(0);
  });

  it("includes drivingKm and drivingMinutes in distance entries", () => {
    const drivingDistances = new Map<string, DrivingDistance>([
      ["h1:d1", { drivingKm: 5.2, drivingMinutes: 12 }],
      ["h1:d2", { drivingKm: 3.1, drivingMinutes: 7 }],
    ]);

    const result = rankHomestays(homestays, destinations, drivingDistances);
    const h1 = result.find((r) => r.homestay.id === "h1")!;
    const d1Entry = h1.distances.find((d) => d.destination.id === "d1")!;
    expect(d1Entry.drivingKm).toBe(5.2);
    expect(d1Entry.drivingMinutes).toBe(12);
    expect(d1Entry.km).toBeGreaterThan(0); // haversine still present
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/ranking.test.ts`
Expected: FAIL — `rankHomestays` doesn't accept 3rd argument, no `drivingKm` on entries

**Step 4: Update ranking implementation**

Replace `src/lib/ranking.ts`:

```typescript
import { haversineKm } from "./distance";
import type { Location, RankedHomestay } from "./types";
import type { DrivingDistance } from "@/store/distance-store";

export function rankHomestays(
  homestays: Location[],
  destinations: Location[],
  drivingDistances?: Map<string, DrivingDistance>
): RankedHomestay[] {
  if (homestays.length === 0 || destinations.length === 0) return [];

  const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);

  return homestays
    .map((homestay) => {
      const distances = destinations.map((dest) => {
        const key = `${homestay.id}:${dest.id}`;
        const driving = drivingDistances?.get(key);
        const haversine = haversineKm(homestay.lat, homestay.lon, dest.lat, dest.lon);

        return {
          destination: dest,
          km: haversine,
          drivingKm: driving?.drivingKm,
          drivingMinutes: driving?.drivingMinutes,
        };
      });

      const weightedAvgKm =
        distances.reduce((sum, d) => {
          const effectiveKm = d.drivingKm ?? d.km;
          return sum + effectiveKm * d.destination.priority;
        }, 0) / totalWeight;

      return { homestay, weightedAvgKm, distances };
    })
    .sort((a, b) => a.weightedAvgKm - b.weightedAvgKm);
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ranking.test.ts`
Expected: PASS (both old and new tests)

**Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/ranking.ts src/lib/__tests__/ranking.test.ts
git commit -m "feat: ranking uses driving distances with haversine fallback"
```

---

### Task 4: Auto-Fetch Hook

**Files:**
- Create: `src/hooks/use-auto-fetch-distances.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";

export function useAutoFetchDistances() {
  const locations = useTripStore((s) => s.locations);
  const fetchDistances = useDistanceStore((s) => s.fetchDistances);
  const clear = useDistanceStore((s) => s.clear);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const homestays = locations.filter((l) => l.type === "homestay");
    const destinations = locations.filter((l) => l.type === "destination");

    if (homestays.length === 0 || destinations.length === 0) {
      clear();
      return;
    }

    timerRef.current = setTimeout(() => {
      fetchDistances(homestays, destinations);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locations, fetchDistances, clear]);
}
```

**Step 2: Wire into trip page**

In `src/app/trip/[slug]/page.tsx`, add:

```typescript
import { useAutoFetchDistances } from "@/hooks/use-auto-fetch-distances";
```

Inside `TripPage()`, add after `useAutoSave(slug)`:

```typescript
useAutoFetchDistances();
```

**Step 3: Commit**

```bash
git add src/hooks/use-auto-fetch-distances.ts src/app/trip/[slug]/page.tsx
git commit -m "feat: auto-fetch driving distances when locations change"
```

---

### Task 5: Update Ranking List Component

**Files:**
- Modify: `src/components/ranking-list.tsx`

**Step 1: Update to pass driving distances to ranking**

```typescript
import { useDistanceStore } from "@/store/distance-store";
```

Inside `RankingList`, add:

```typescript
const distances = useDistanceStore((s) => s.distances);
const distancesLoading = useDistanceStore((s) => s.loading);
```

Update the `ranked` useMemo:

```typescript
const ranked = useMemo(
  () => rankHomestays(homestays, destinations, distances),
  [homestays, destinations, distances]
);
```

Update the distance display in the button to show a loading indicator:

```tsx
<span className="text-muted-foreground text-xs flex items-center gap-1">
  {distancesLoading && (
    <Loader2 className="h-3 w-3 animate-spin" />
  )}
  avg {r.weightedAvgKm.toFixed(1)} km
</span>
```

Add `Loader2` to lucide-react imports.

**Step 2: Verify manually**

Run: `npm run dev` — add locations, confirm ranking updates after driving distances load.

**Step 3: Commit**

```bash
git add src/components/ranking-list.tsx
git commit -m "feat: ranking list uses driving distances with loading indicator"
```

---

### Task 6: Update Distance Matrix Component

**Files:**
- Modify: `src/components/distance-matrix.tsx`
- Delete: `src/components/driving-time-button.tsx`

**Step 1: Update distance matrix to use driving distances**

Replace distance matrix to show driving distances as primary, haversine as fallback:

```typescript
import { useDistanceStore } from "@/store/distance-store";
import { Loader2, Car } from "lucide-react";
```

Add inside `DistanceMatrix`:

```typescript
const drivingDistances = useDistanceStore((s) => s.distances);
const distancesLoading = useDistanceStore((s) => s.loading);
```

Replace the cell rendering. For each homestay-destination pair:

```tsx
{destinations.map((d, i) => {
  const key = `${h.id}:${d.id}`;
  const driving = drivingDistances.get(key);
  const haversine = dists[i];

  return (
    <td key={d.id} className="p-2 text-center">
      {driving ? (
        <div>
          <div className="flex items-center justify-center gap-1">
            <Car className="h-3 w-3 text-muted-foreground" />
            <span>{driving.drivingKm.toFixed(1)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {driving.drivingMinutes.toFixed(0)} min
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <span className={distancesLoading ? "text-muted-foreground" : ""}>
            {haversine.toFixed(1)}
          </span>
          {distancesLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
      )}
    </td>
  );
})}
```

Update the avg column to use driving distances when available:

```typescript
const avg = destinations.reduce((sum, d, i) => {
  const key = `${h.id}:${d.id}`;
  const driving = drivingDistances.get(key);
  return sum + (driving ? driving.drivingKm : dists[i]);
}, 0) / destinations.length;
```

Remove the `DrivingTimeButton` import.

**Step 2: Delete `DrivingTimeButton`**

Delete `src/components/driving-time-button.tsx`.

**Step 3: Verify no other imports of DrivingTimeButton**

Run: `npx grep -r "DrivingTimeButton\|driving-time-button" src/`
Expected: no matches

**Step 4: Commit**

```bash
git add src/components/distance-matrix.tsx
git rm src/components/driving-time-button.tsx
git commit -m "feat: distance matrix shows driving distances, remove DrivingTimeButton"
```

---

### Task 7: Update Map Polyline Colors

**Files:**
- Modify: `src/components/map-inner.tsx`

**Step 1: Use driving distances for polyline color gradient**

Add imports:

```typescript
import { useDistanceStore } from "@/store/distance-store";
```

Inside `MapInner`, add:

```typescript
const drivingDistances = useDistanceStore((s) => s.distances);
```

Update `maxKm` calculation:

```typescript
const maxKm =
  selectedHomestay && destinations.length > 0
    ? Math.max(
        ...destinations.map((d) => {
          const key = `${selectedHomestay.id}:${d.id}`;
          const driving = drivingDistances.get(key);
          return driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
        })
      )
    : 10;
```

Update the polyline rendering to use driving distance for color:

```tsx
{selectedHomestay &&
  destinations.map((d) => {
    const key = `${selectedHomestay.id}:${d.id}`;
    const driving = drivingDistances.get(key);
    const km = driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
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
```

**Step 2: Commit**

```bash
git add src/components/map-inner.tsx
git commit -m "feat: map polyline colors use driving distances"
```

---

### Task 8: Run Full Test Suite and Lint

**Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found**

If any test/lint/build failures, fix them.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test/lint/build issues"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `docs/architecture.md` (create if missing)
- Modify: `README.md`

**Step 1: Update architecture docs**

Add a section on the driving distance system: OSRM Table API, distance store, auto-fetch hook, fallback behavior.

**Step 2: Update README**

Add note about real driving distances in the features section. Mention OSRM dependency.

**Step 3: Commit**

```bash
git add docs/architecture.md README.md
git commit -m "docs: document driving distance architecture and usage"
```
