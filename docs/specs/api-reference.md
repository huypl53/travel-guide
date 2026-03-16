# API Reference

All routes are Next.js App Router API routes under `src/app/api/`.

## Geocoding

### GET /api/geocode

Proxy to Nominatim OpenStreetMap search. Scoped to Vietnam (`countrycodes=vn`).

| Param | Type   | Description      |
|-------|--------|------------------|
| `q`   | string | Search query     |

**Response:** `Array<{ name: string, lat: number, lon: number }>` (max 5 results)

### GET /api/resolve-url

Follow short URL redirects server-side (e.g., `maps.app.goo.gl`).

| Param | Type   | Description       |
|-------|--------|-------------------|
| `url` | string | Short Google Maps URL |

**Response:** `{ resolvedUrl: string }`

---

## Distances & Routes

### GET /api/distances

Bulk driving distance matrix via OSRM Table API.

| Param          | Type   | Example                    | Description                    |
|----------------|--------|----------------------------|--------------------------------|
| `sources`      | string | `11.94,108.45;12.0,108.5`  | Semicolon-separated lat,lon    |
| `destinations` | string | `11.95,108.46`             | Semicolon-separated lat,lon    |

**Response:**
```json
{
  "matrix": [
    [{ "distanceKm": 5.2, "durationMinutes": 12 }, null],
    [{ "distanceKm": 3.1, "durationMinutes": 7 }, { "distanceKm": 8.0, "durationMinutes": 15 }]
  ]
}
```

**Errors:**
- `400` — Missing params, invalid coordinates, or >100 total coordinates
- `502` — OSRM server unreachable or returned error

### GET /api/routes

Fetch driving route polyline geometry for map visualization.

| Param | Type   | Example          | Description    |
|-------|--------|------------------|----------------|
| `from` | string | `11.94,108.45`  | Origin lat,lon |
| `to`   | string | `11.95,108.46`  | Dest lat,lon   |

**Response:** `{ geometry: string }` — Encoded polyline (precision 5). Decode with `decodePolyline()` from `src/lib/osrm.ts`.

**Errors:**
- `400` — Missing params or invalid coordinates
- `502` — OSRM unreachable or no route found

### GET /api/directions (Legacy)

Single route distance/duration. Superseded by `/api/distances` for bulk operations.

| Param | Type   | Description    |
|-------|--------|----------------|
| `from` | string | Origin lat,lon |
| `to`   | string | Dest lat,lon   |

**Response:** `{ distanceKm: number, durationMinutes: number }`

---

## Trips

### POST /api/trips

Create a new trip.

**Request Body:**
```json
{
  "name": "Da Lat Trip",
  "locations": [
    { "id": "abc", "type": "homestay", "name": "H1", "lat": 11.94, "lon": 108.45, "priority": 3, "source": "manual" }
  ]
}
```

- `locations` is optional (used when sharing anonymous trips)
- If user is authenticated, `user_id` is captured automatically
- `share_slug` is auto-generated via `nanoid(10)`

**Response:** `{ slug: string, id: string }`

### GET /api/trips/[slug]

Retrieve trip by share slug. Public access (no auth required).

**Response:**
```json
{
  "id": "uuid",
  "name": "Da Lat Trip",
  "share_slug": "abc123",
  "user_id": "uuid or null",
  "created_at": "2026-03-16T...",
  "locations": [
    { "id": "uuid", "trip_id": "uuid", "type": "homestay", "name": "H1", ... }
  ]
}
```

### DELETE /api/trips/[slug]

Delete a trip. Requires authentication.

- If user owns the trip: deletes trip + cascades (locations, distance_cache)
- If user doesn't own it: removes from saved_trips only

**Response:** `{ ok: true }`

---

## Saved Trips

### POST /api/saved-trips

Save a shared trip to the current user's account.

**Request Body:** `{ tripId: string }`

**Auth:** Required. Returns `401` if not authenticated.

**Response:** `{ ok: true }`

**Constraint:** Unique (user_id, trip_id) — saving twice is a no-op or conflict.

### DELETE /api/saved-trips

Remove a saved trip.

**Request Body:** `{ tripId: string }`

**Auth:** Required.

**Response:** `{ ok: true }`

---

## Auth

### GET /api/auth/callback

OAuth and magic link callback handler.

| Param  | Type   | Description                     |
|--------|--------|---------------------------------|
| `code` | string | Authorization code from Supabase |
| `next` | string | Redirect URL after auth (default `/`) |

**Behavior:**
- Exchanges code for session
- Detects password recovery (recovery_sent_at < 10 min) → redirects to `/reset-password`
- Normal auth → redirects to `next` or `/`

---

## External Services

| Service       | Base URL                              | Rate Limit     | Used By           |
|---------------|---------------------------------------|----------------|-------------------|
| Nominatim OSM | `nominatim.openstreetmap.org/search`  | 1 req/sec      | /api/geocode      |
| OSRM Table    | `router.project-osrm.org/table/v1`   | Best-effort    | /api/distances    |
| OSRM Route    | `router.project-osrm.org/route/v1`   | Best-effort    | /api/routes       |
| Supabase      | Project-specific                      | Free: 500MB DB | /api/trips, auth  |

**Note:** OSRM and Nominatim are public demo servers. For production traffic, self-host or use a paid provider.
