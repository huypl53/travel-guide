# Scrollable Lists, Selection & Route Caching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scrollable location lists, multi-select with visual dimming across all components, and concurrency-limited route fetching.

**Architecture:** Extend Zustand trip-store with selection sets. All components read selection state and apply `opacity-40` to unselected items. Route fetching gets a concurrency limiter (max 3 parallel requests).

**Tech Stack:** React 19, Zustand, Tailwind CSS, Leaflet, Google Maps (`@vis.gl/react-google-maps`), Vitest

---

### Task 1: Add Selection State to Trip Store

**Files:**
- Modify: `src/store/trip-store.ts`
- Test: `src/store/__tests__/trip-store.test.ts`

**Step 1: Write failing tests**

Add these tests to `src/store/__tests__/trip-store.test.ts`:

```typescript
it("new location is auto-added to selection set", () => {
  useTripStore.getState().addLocation({
    type: "homestay",
    name: "Villa",
    lat: 11.94,
    lon: 108.45,
    address: null,
    source: "manual",
  });
  const id = useTripStore.getState().locations[0].id;
  expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(true);
});

it("new destination is auto-added to selection set", () => {
  useTripStore.getState().addLocation({
    type: "destination",
    name: "Dest",
    lat: 11.93,
    lon: 108.43,
    address: null,
    source: "manual",
  });
  const id = useTripStore.getState().locations[0].id;
  expect(useTripStore.getState().selectedDestinationIds.has(id)).toBe(true);
});

it("removed location is removed from selection set", () => {
  useTripStore.getState().addLocation({
    type: "homestay",
    name: "Villa",
    lat: 11.94,
    lon: 108.45,
    address: null,
    source: "manual",
  });
  const id = useTripStore.getState().locations[0].id;
  useTripStore.getState().removeLocation(id);
  expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(false);
});

it("toggleLocationSelection toggles selection", () => {
  useTripStore.getState().addLocation({
    type: "homestay",
    name: "Villa",
    lat: 11.94,
    lon: 108.45,
    address: null,
    source: "manual",
  });
  const id = useTripStore.getState().locations[0].id;
  useTripStore.getState().toggleLocationSelection(id);
  expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(false);
  useTripStore.getState().toggleLocationSelection(id);
  expect(useTripStore.getState().selectedHomestayIds.has(id)).toBe(true);
});

it("selectAllByType selects all of a type", () => {
  useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
  useTripStore.getState().addLocation({ type: "homestay", name: "B", lat: 2, lon: 2, address: null, source: "manual" });
  const ids = useTripStore.getState().locations.map((l) => l.id);
  // Deselect all first
  ids.forEach((id) => useTripStore.getState().toggleLocationSelection(id));
  expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
  // Select all
  useTripStore.getState().selectAllByType("homestay");
  expect(useTripStore.getState().selectedHomestayIds.size).toBe(2);
});

it("deselectAllByType deselects all of a type", () => {
  useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
  useTripStore.getState().addLocation({ type: "homestay", name: "B", lat: 2, lon: 2, address: null, source: "manual" });
  useTripStore.getState().deselectAllByType("homestay");
  expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
});

it("reset clears selection sets", () => {
  useTripStore.getState().addLocation({ type: "homestay", name: "A", lat: 1, lon: 1, address: null, source: "manual" });
  useTripStore.getState().reset();
  expect(useTripStore.getState().selectedHomestayIds.size).toBe(0);
  expect(useTripStore.getState().selectedDestinationIds.size).toBe(0);
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/trip-store.test.ts`
Expected: FAIL — `selectedHomestayIds` does not exist on state

**Step 3: Implement selection state in trip store**

In `src/store/trip-store.ts`, add to `TripState` interface:

```typescript
selectedHomestayIds: Set<string>;
selectedDestinationIds: Set<string>;
toggleLocationSelection: (id: string) => void;
selectAllByType: (type: LocationType) => void;
deselectAllByType: (type: LocationType) => void;
```

Add initial state:

```typescript
selectedHomestayIds: new Set<string>(),
selectedDestinationIds: new Set<string>(),
```

Update `addLocation` — after creating the location, also add its id to the appropriate selection set:

```typescript
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
  set((state) => {
    const setKey = input.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
    const newSet = new Set(state[setKey]);
    newSet.add(location.id);
    return { locations: [...state.locations, location], [setKey]: newSet };
  });
},
```

Update `removeLocation` — also remove from selection set:

```typescript
removeLocation: (id) =>
  set((state) => {
    const loc = state.locations.find((l) => l.id === id);
    if (!loc) return { locations: state.locations };
    const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
    const newSet = new Set(state[setKey]);
    newSet.delete(id);
    return {
      locations: state.locations.filter((l) => l.id !== id),
      [setKey]: newSet,
    };
  }),
```

Add new actions:

```typescript
toggleLocationSelection: (id) =>
  set((state) => {
    const loc = state.locations.find((l) => l.id === id);
    if (!loc) return {};
    const setKey = loc.type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
    const newSet = new Set(state[setKey]);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return { [setKey]: newSet };
  }),

selectAllByType: (type) =>
  set((state) => {
    const setKey = type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
    const ids = state.locations.filter((l) => l.type === type).map((l) => l.id);
    return { [setKey]: new Set(ids) };
  }),

deselectAllByType: (type) =>
  set(() => {
    const setKey = type === "homestay" ? "selectedHomestayIds" : "selectedDestinationIds";
    return { [setKey]: new Set<string>() };
  }),
```

Update `reset`:

```typescript
reset: () => set({ tripName: "", locations: [], selectedHomestayId: null, focusedLocation: null, selectedHomestayIds: new Set(), selectedDestinationIds: new Set() }),
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/__tests__/trip-store.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/store/trip-store.ts src/store/__tests__/trip-store.test.ts
git commit -m "feat: add selection state to trip store"
```

---

### Task 2: Scrollable Location Lists

**Files:**
- Modify: `src/components/location-list.tsx`

**Step 1: Add scrollable container**

Wrap the `<ul>` in a div with max height and overflow. In `src/components/location-list.tsx`, change:

```tsx
// Before
<ul className="space-y-1">

// After
<ul className="space-y-1 max-h-[300px] overflow-y-auto">
```

**Step 2: Verify visually**

Run: `npx next dev`
Add 6+ homestays or destinations and confirm the list scrolls within its container.

**Step 3: Commit**

```bash
git add src/components/location-list.tsx
git commit -m "feat: make location lists scrollable at 300px max height"
```

---

### Task 3: Selection Checkboxes and Select All/None in LocationList

**Files:**
- Modify: `src/components/location-list.tsx`
- Modify: `src/app/trip/[slug]/page.tsx`

**Step 1: Add checkboxes to LocationList items**

In `src/components/location-list.tsx`:

1. Import `Check, Square, CheckSquare` from `lucide-react` (or use shadcn Checkbox)
2. Read selection state: `const selectedIds = useTripStore((s) => type === "homestay" ? s.selectedHomestayIds : s.selectedDestinationIds);`
3. Read toggle action: `const toggleSelection = useTripStore((s) => s.toggleLocationSelection);`
4. Add a checkbox icon before the name in each `<li>`, toggling on click:

```tsx
<button
  className="mr-1.5 flex-shrink-0"
  onClick={(e) => { e.stopPropagation(); toggleSelection(loc.id); }}
  aria-label={selectedIds.has(loc.id) ? "Deselect" : "Select"}
>
  {selectedIds.has(loc.id) ? (
    <CheckSquare className="h-3.5 w-3.5 text-primary" />
  ) : (
    <Square className="h-3.5 w-3.5 text-muted-foreground" />
  )}
</button>
```

5. Apply opacity to unselected items — add to the `<li>` className:

```tsx
className={`flex items-center justify-between py-1 px-2 rounded hover:bg-muted border-l-2 cursor-pointer ${
  loc.type === "destination" ? "border-l-red-400" : "border-l-blue-400"
} ${!selectedIds.has(loc.id) ? "opacity-40" : ""}`}
```

**Step 2: Add Select All / Deselect All buttons to trip page**

In `src/app/trip/[slug]/page.tsx`, add buttons next to each section header.

For the Homestays card, update the `<h2>` area:

```tsx
<div className="flex items-center justify-between">
  <h2 className="font-semibold flex items-center gap-2">
    <Home className="h-4 w-4 text-muted-foreground" />
    Homestays
  </h2>
  <SelectAllButtons type="homestay" />
</div>
```

Create a small inline component (in the same file or in location-list.tsx):

```tsx
function SelectAllButtons({ type }: { type: LocationType }) {
  const selectAll = useTripStore((s) => s.selectAllByType);
  const deselectAll = useTripStore((s) => s.deselectAllByType);
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => selectAll(type)}>
        All
      </Button>
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => deselectAll(type)}>
        None
      </Button>
    </div>
  );
}
```

Do the same for the Destinations card header.

**Step 3: Verify visually**

Run dev server, add locations, toggle checkboxes, use All/None buttons.

**Step 4: Commit**

```bash
git add src/components/location-list.tsx src/app/trip/[slug]/page.tsx
git commit -m "feat: add selection checkboxes and select all/none buttons"
```

---

### Task 4: Dim Unselected Rows in RankingList

**Files:**
- Modify: `src/components/ranking-list.tsx`

**Step 1: Read selection state and apply dimming**

In `src/components/ranking-list.tsx`:

1. Read selection: `const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);`
2. On each `<Button>` in the ranking list, add conditional opacity:

```tsx
<Button
  key={r.homestay.id}
  variant={r.homestay.id === selectedId ? "secondary" : "ghost"}
  className={`w-full justify-between h-auto py-2 ${
    !selectedHomestayIds.has(r.homestay.id) ? "opacity-40 blur-[0.5px]" : ""
  }`}
  onClick={() => setSelected(r.homestay.id)}
>
```

**Step 2: Verify visually**

Run dev server, deselect a homestay, confirm its ranking row is dimmed.

**Step 3: Commit**

```bash
git add src/components/ranking-list.tsx
git commit -m "feat: dim unselected homestays in ranking list"
```

---

### Task 5: Dim Unselected Rows/Columns in DistanceMatrix

**Files:**
- Modify: `src/components/distance-matrix.tsx`

**Step 1: Read selection state**

```tsx
const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);
```

**Step 2: Apply dimming to destination column headers**

```tsx
<th key={d.id} className={`p-2 text-center max-w-[80px] truncate ${
  !selectedDestinationIds.has(d.id) ? "opacity-40" : ""
}`}>
  {d.name}
</th>
```

**Step 3: Apply dimming to homestay rows**

On each `<tr>`, add opacity for unselected homestays:

```tsx
<tr
  key={h.id}
  className={`hover:bg-muted cursor-pointer border-b border-border/50 ${
    rowIndex % 2 !== 0 ? "bg-muted/30" : ""
  } ${!selectedHomestayIds.has(h.id) ? "opacity-40" : ""}`}
  onClick={() => setSelected(h.id)}
>
```

**Step 4: Apply dimming to destination cells**

On each `<td>` for destinations:

```tsx
<td key={d.id} className={`p-2 text-center ${
  !selectedDestinationIds.has(d.id) ? "opacity-40" : ""
}`}>
```

**Step 5: Verify visually**

Run dev server, deselect a homestay and a destination, confirm rows and columns dim.

**Step 6: Commit**

```bash
git add src/components/distance-matrix.tsx
git commit -m "feat: dim unselected items in distance matrix"
```

---

### Task 6: Dim Unselected Markers and Routes on Leaflet Map

**Files:**
- Modify: `src/components/map-providers/leaflet-map.tsx`

**Step 1: Read selection state**

```tsx
const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);
```

**Step 2: Apply opacity to homestay markers**

Change the homestay markers loop to set marker opacity:

```tsx
{homestays.map((h) => (
  <Marker
    key={h.id}
    position={[h.lat, h.lon]}
    icon={homestayIcon}
    opacity={selectedHomestayIds.has(h.id) ? 1 : 0.4}
    eventHandlers={{ click: () => setSelected(h.id) }}
  >
    <Popup>{h.name}</Popup>
  </Marker>
))}
```

**Step 3: Apply opacity to destination markers**

```tsx
{destinations.map((d) => (
  <Marker
    key={d.id}
    position={[d.lat, d.lon]}
    icon={destinationIcon}
    opacity={selectedDestinationIds.has(d.id) ? 1 : 0.4}
  >
    <Popup>
      {d.name} (priority: {d.priority})
    </Popup>
  </Marker>
))}
```

**Step 4: Show routes for all homestays, dim unselected**

Currently routes are only shown for `selectedHomestay` (the one clicked in rankings). Change this to show routes for ALL homestays, but dim the unselected ones.

Replace the current route rendering block (lines 124-145) with:

```tsx
{homestays.map((h) => {
  const isSelected = selectedHomestayIds.has(h.id);
  return destinations.map((d) => {
    const key = `${h.id}:${d.id}`;
    const driving = drivingDistances.get(key);
    const routeGeometry = routes.get(key);
    const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);
    const positions: [number, number][] = routeGeometry ?? [
      [h.lat, h.lon],
      [d.lat, d.lon],
    ];
    return (
      <Polyline
        key={`${h.id}-${d.id}`}
        positions={positions}
        pathOptions={{
          color: distanceToColor(km, maxKm),
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.8 : 0.15,
        }}
      />
    );
  });
})}
```

**Step 5: Update route fetching effect to fetch for all homestays**

Replace the current useEffect (lines 79-83) to fetch routes for all homestays, not just the selected one:

```tsx
useEffect(() => {
  if (destinations.length > 0) {
    homestays.forEach((h) => fetchRoutes(h, destinations));
  }
}, [homestays, destinations, fetchRoutes]);
```

**Step 6: Update maxKm calculation to consider all homestays**

Replace the maxKm calculation to use all homestays for color scaling:

```tsx
const maxKm = useMemo(() => {
  if (homestays.length === 0 || destinations.length === 0) return 10;
  let max = 0;
  for (const h of homestays) {
    for (const d of destinations) {
      const key = `${h.id}:${d.id}`;
      const driving = drivingDistances.get(key);
      const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);
      if (km > max) max = km;
    }
  }
  return max || 10;
}, [homestays, destinations, drivingDistances]);
```

Remove `selectedHomestay` variable if no longer needed by other code.

**Step 7: Verify visually**

Run dev server, add homestays and destinations, deselect some, confirm dimmed markers and routes.

**Step 8: Commit**

```bash
git add src/components/map-providers/leaflet-map.tsx
git commit -m "feat: dim unselected markers and routes on Leaflet map"
```

---

### Task 7: Dim Unselected Markers and Routes on Google Map

**Files:**
- Modify: `src/components/map-providers/google-map.tsx`

**Step 1: Read selection state**

```tsx
const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);
```

**Step 2: Apply opacity to homestay markers**

On each homestay `<AdvancedMarker>`, wrap the `<Pin>` to set opacity:

```tsx
{homestays.map((h) => (
  <AdvancedMarker
    key={h.id}
    position={{ lat: h.lat, lng: h.lon }}
    title={h.name}
    onClick={handleMarkerClick(h.id)}
  >
    <div style={{ opacity: selectedHomestayIds.has(h.id) ? 1 : 0.4 }}>
      <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#fff" />
    </div>
  </AdvancedMarker>
))}
```

**Step 3: Apply opacity to destination markers**

```tsx
{destinations.map((d) => (
  <AdvancedMarker
    key={d.id}
    position={{ lat: d.lat, lng: d.lon }}
    title={`${d.name} (priority: ${d.priority})`}
  >
    <div style={{ opacity: selectedDestinationIds.has(d.id) ? 1 : 0.4 }}>
      <Pin background="#ef4444" borderColor="#991b1b" glyphColor="#fff" />
    </div>
  </AdvancedMarker>
))}
```

**Step 4: Update RoutePolylines to render all homestays with dimming**

Change the `RoutePolylines` component to accept all homestays and selection state. Update its props and loop:

```tsx
function RoutePolylines({
  homestays,
  destinations,
  selectedHomestayIds,
  drivingDistances,
  routes,
  maxKm,
}: {
  homestays: { id: string; lat: number; lon: number }[];
  destinations: { id: string; lat: number; lon: number }[];
  selectedHomestayIds: Set<string>;
  drivingDistances: Map<string, { drivingKm: number }>;
  routes: Map<string, [number, number][]>;
  maxKm: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const polylines: google.maps.Polyline[] = [];

    for (const h of homestays) {
      const isSelected = selectedHomestayIds.has(h.id);
      for (const d of destinations) {
        const key = `${h.id}:${d.id}`;
        const driving = drivingDistances.get(key);
        const routeGeometry = routes.get(key);
        const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);

        const path = routeGeometry
          ? routeGeometry.map(([lat, lon]) => ({ lat, lng: lon }))
          : [
              { lat: h.lat, lng: h.lon },
              { lat: d.lat, lng: d.lon },
            ];

        const polyline = new google.maps.Polyline({
          path,
          strokeColor: distanceToColor(km, maxKm),
          strokeWeight: isSelected ? 3 : 2,
          strokeOpacity: isSelected ? 0.8 : 0.15,
          map,
        });
        polylines.push(polyline);
      }
    }

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, homestays, destinations, selectedHomestayIds, drivingDistances, routes, maxKm]);

  return null;
}
```

Update the parent component to pass new props and fetch routes for all homestays:

```tsx
useEffect(() => {
  if (destinations.length > 0) {
    homestays.forEach((h) => fetchRoutes(h, destinations));
  }
}, [homestays, destinations, fetchRoutes]);
```

Update maxKm to use all homestays (same as Task 6 Step 6).

Pass updated props to `<RoutePolylines>`:

```tsx
{homestays.length > 0 && destinations.length > 0 && (
  <RoutePolylines
    homestays={homestays}
    destinations={destinations}
    selectedHomestayIds={selectedHomestayIds}
    drivingDistances={drivingDistances}
    routes={routes}
    maxKm={maxKm}
  />
)}
```

**Step 5: Verify visually**

Run dev server with Google Maps provider, test same scenarios.

**Step 6: Commit**

```bash
git add src/components/map-providers/google-map.tsx
git commit -m "feat: dim unselected markers and routes on Google map"
```

---

### Task 8: Concurrency-Limited Route Fetching

**Files:**
- Modify: `src/store/distance-store.ts`
- Test: `src/lib/__tests__/distance-store.test.ts`

**Step 1: Read existing distance store tests**

Read `src/lib/__tests__/distance-store.test.ts` to understand existing test patterns.

**Step 2: Write failing test for concurrency limiting**

Add to `src/lib/__tests__/distance-store.test.ts`:

```typescript
it("limits concurrent route fetches to 3", async () => {
  let activeRequests = 0;
  let maxActive = 0;

  global.fetch = vi.fn(() => {
    activeRequests++;
    maxActive = Math.max(maxActive, activeRequests);
    return new Promise((resolve) =>
      setTimeout(() => {
        activeRequests--;
        resolve(new Response(JSON.stringify({ geometry: [[1, 2]] }), { status: 200 }));
      }, 50)
    );
  }) as unknown as typeof fetch;

  const homestay = { id: "h1", tripId: "", type: "homestay" as const, name: "H", lat: 1, lon: 1, address: null, priority: 3, source: "manual" as const };
  const destinations = Array.from({ length: 6 }, (_, i) => ({
    id: `d${i}`, tripId: "", type: "destination" as const, name: `D${i}`, lat: i, lon: i, address: null, priority: 3, source: "manual" as const,
  }));

  await useDistanceStore.getState().fetchRoutes(homestay, destinations);
  expect(maxActive).toBeLessThanOrEqual(3);
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/distance-store.test.ts`
Expected: FAIL — maxActive will be 6 (all fire in parallel)

**Step 4: Implement concurrency limiter**

In `src/store/distance-store.ts`, add a simple concurrency limiter before the store:

```typescript
async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}
```

Replace `Promise.all` in `fetchRoutes` with the limiter:

```typescript
fetchRoutes: async (homestay, destinations) => {
  if (destinations.length === 0) return;

  const needed = destinations.filter((d) => !get().routes.has(`${homestay.id}:${d.id}`));
  if (needed.length === 0) return;

  set({ routesLoading: true });

  const tasks = needed.map((dest) => async () => {
    try {
      const res = await fetch(`/api/routes?from=${homestay.lat},${homestay.lon}&to=${dest.lat},${dest.lon}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.geometry) return null;
      return { key: `${homestay.id}:${dest.id}`, points: data.geometry as [number, number][] };
    } catch {
      return null;
    }
  });

  const results = await limitConcurrency(tasks, 3);

  const merged = new Map(get().routes);
  for (const r of results) {
    if (r) merged.set(r.key, r.points);
  }

  set({ routes: merged, routesLoading: false });
},
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/distance-store.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/store/distance-store.ts src/lib/__tests__/distance-store.test.ts
git commit -m "feat: limit concurrent route fetches to 3"
```

---

### Task 9: Preserve Route Cache on Location Changes

**Files:**
- Modify: `src/store/distance-store.ts`

**Step 1: Update clear to preserve valid routes**

Add a `clearForLocations` method that only removes routes for removed locations, keeping the rest cached. Or simpler: split `clear()` into `clearDistances()` (for recalculation) and `clearAll()` (for full reset).

Check if `clear()` is called from anywhere besides full reset. If it's only called on trip reset, this might already be fine. Check callers:

Run: search for `.clear()` on distance store in the codebase.

If `clear()` is only called on full trip reset, no change needed — the existing caching already works correctly. If called elsewhere, update callers to use `clearDistances()` instead.

**Step 2: Commit if any changes**

```bash
git add src/store/distance-store.ts
git commit -m "fix: preserve route cache across distance recalculations"
```

---

### Task 10: Update README and Architecture Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md` (create if missing)

**Step 1: Update README**

Add a note about the new features under the features section:
- Scrollable lists for handling many locations
- Multi-select with visual comparison (dimming unselected items across all views)

**Step 2: Update architecture docs**

Document the selection state in the store and how dimming propagates across components.

**Step 3: Commit**

```bash
git add README.md docs/architecture.md
git commit -m "docs: update README and architecture for selection and scrolling features"
```
