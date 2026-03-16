# User Flows

## 1. Anonymous Trip Creation

```
User visits /
  → clicks "Start New Trip"
  → client generates nanoid(10) slug
  → navigates to /trip/[slug]
  → useAutoSave: no-op (no authenticated user)
  → user adds locations via LocationInput
    ├── Paste Google Maps URL (long or short)
    │   └── short URL → /api/resolve-url → expanded URL → parseGoogleMapsUrl()
    ├── Search address → /api/geocode (Nominatim, Vietnam only)
    └── Upload CSV/JSON file → parseCsvLocations() / parseJsonLocations()
  → useAutoFetchDistances triggers (300ms debounce)
    → /api/distances → OSRM Table API → distance store populated
  → ranking + distance matrix + map polylines update automatically
  → user clicks Share → POST /api/trips (creates trip in DB)
    → share link copied: /trip/[slug]/share
```

**Key point:** Trip only persists to DB when shared. Before that, it's client-side only.

## 2. Authenticated Trip Creation

```
User signs in (Google OAuth / magic link / email+password)
  → lands on / → MyTripsList shown (own + saved trips)
  → clicks "New Trip"
  → client generates slug, navigates to /trip/[slug]
  → useAutoSave:
    1. getUser() → authenticated
    2. Trip doesn't exist → POST /api/trips with user_id
    3. Subscribe to store changes
    4. On change → debounce 2s → update trip name + delete/re-insert locations
  → all changes auto-saved to Supabase
  → trip persists across sessions
```

## 3. Share & Save Flow

```
User A creates trip, clicks Share
  → POST /api/trips (if not already saved)
  → share URL copied: /trip/[slug]/share

User B (logged in) opens /trip/[slug]/share
  → server fetches trip by slug (public read via RLS)
  → read-only view rendered
  → clicks "Save to My Trips"
    → POST /api/saved-trips { tripId }
    → trip appears in User B's MyTripsList with "Saved" badge

User B clicks saved trip card
  → navigates to /trip/[slug] (full workspace, but useAutoSave only saves if they own it)
```

## 4. Ranking & Distance Calculation

```
Locations change in useTripStore
  → useAutoFetchDistances (300ms debounce)
  → check coord hash for deduplication
  → GET /api/distances?sources=...&destinations=...
    → server builds OSRM Table API URL (lon,lat ordering)
    → single request for all NxM pairs
    → parse response: meters→km, seconds→minutes
  → useDistanceStore.distances populated (Map<"hId:dId", {drivingKm, drivingMinutes}>)
  → consumers re-render:
    ├── RankingList: rankHomestays(homestays, destinations, drivingDistances)
    │   → weighted avg using driving km (fallback: haversine)
    │   → sorted best-first
    ├── DistanceMatrix: shows driving km + duration per cell (car icon)
    │   → haversine + spinner while loading
    └── MapInner: polyline colors use driving distance for gradient
```

## 5. Route Polyline Visualization

```
User selects a homestay (click in RankingList or DistanceMatrix)
  → useTripStore.selectedHomestayId set
  → MapInner effect triggers:
    → useDistanceStore.fetchRoutes(homestay, destinations)
    → for each destination not in cache:
      → GET /api/routes?from=lat,lon&to=lat,lon
      → server calls OSRM route API (overview=full, geometries=polyline)
      → returns encoded polyline geometry
    → client decodes polyline → [lat,lon][] points
    → routes cached in store (Map<"hId:dId", points>)
  → Polyline rendered with actual road path (not straight line)
  → color: green (close) → red (far) based on driving km
  → fallback: straight line if no geometry available
```

## 6. Authentication Flow

```
Google OAuth:
  AuthDialog → signInWithOAuth("google")
  → redirect to Supabase OAuth provider
  → redirect back to /api/auth/callback?code=...
  → exchange code for session → set cookies
  → redirect to / (or next param)

Magic Link:
  AuthDialog → signInWithOtp({ email })
  → Supabase sends email
  → user clicks link → /api/auth/callback?code=...
  → same exchange flow

Password Reset:
  AuthDialog → resetPasswordForEmail(email)
  → Supabase sends recovery email
  → link → /api/auth/callback
  → callback detects recovery_sent_at < 10min → redirect to /reset-password
  → user sets new password → updateUser({ password })

Session Refresh:
  middleware.ts runs on every request
  → createSupabaseServer() reads cookies
  → supabase.auth.getUser() refreshes token if needed
  → updated cookies set in response
```

## 7. Auto-Save Lifecycle

```
/trip/[slug] mounts
  → useAutoSave(slug) initializes:
    1. supabase.auth.getUser()
       → not authenticated? → return (no saving)
    2. GET /api/trips/[slug]
       → exists & user owns it? → load locations into store
       → doesn't exist? → POST /api/trips { name, user_id }
    3. subscribe to store changes via useTripStore.subscribe()

Store changes:
  → debounce timer resets (2 seconds)
  → after 2s idle:
    1. PATCH trip name (if changed)
    2. DELETE all locations for trip
    3. INSERT all current locations (atomic replace)
  → errors silently caught (no user-facing error)

/trip/[slug] unmounts:
  → subscription cleanup
  → pending timer cleared
```

## 8. Trip Deletion

```
From MyTripsList:
  User clicks delete on a trip card
  → onDelete(trip) called

  If user owns the trip:
    → DELETE /api/trips/[slug]
    → server: delete trip (CASCADE removes locations, distance_cache)

  If trip is saved (not owned):
    → DELETE /api/saved-trips { tripId }
    → server: remove saved_trips row only

  → trip removed from local list
```
