# Homestay Locator — Design Document

**Date:** 2026-03-16
**Status:** Approved

## Problem

Travelers in Vietnam need to choose the best homestay based on proximity to multiple popular destinations. Currently this requires manual distance checks on Google Maps for every homestay-destination pair.

## Solution

A web app where users input two sets of locations — homestays and destinations — and get an interactive map + distance matrix that ranks homestays by weighted average distance to all destinations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js App                        │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Map View  │  │   Distance   │  │   Data Input      │ │
│  │ (Leaflet) │  │   Matrix     │  │   Panel           │ │
│  └─────┬─────┘  └──────┬───────┘  └────────┬──────────┘ │
│        │               │                   │            │
│  ┌─────┴───────────────┴───────────────────┴──────────┐ │
│  │              Shared Location Store (Zustand)        │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │              Next.js API Routes                     │ │
│  │   /api/geocode    /api/directions    /api/trips     │ │
│  └────────┬──────────────┬──────────────────┬─────────┘ │
└───────────┼──────────────┼──────────────────┼───────────┘
            │              │                  │
      ┌─────┴─────┐  ┌────┴────┐      ┌─────┴─────┐
      │ Nominatim │  │  OSRM   │      │ Supabase  │
      │ (geocode) │  │(routing)│      │   (DB)    │
      └───────────┘  └─────────┘      └───────────┘
```

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | SSR for SEO, API routes, free Vercel hosting |
| Styling | Tailwind CSS + shadcn/ui | Fast to build, consistent, mobile-friendly |
| Map | Leaflet + react-leaflet | Free, mature, OSM tiles |
| State | Zustand | Lightweight, simple |
| Database | Supabase (Postgres) | Free tier, auth, real-time |
| Geocoding | Nominatim | Free, no API key |
| Routing | OSRM | Free driving distance/time |
| Distance | Haversine (client-side) | Instant straight-line, no API |

## Data Model

### Trip
- `id` (uuid, PK)
- `name` (text, e.g. "Da Lat March 2026")
- `share_slug` (text, unique, for shareable URLs)
- `created_at` (timestamp)

### Location
- `id` (uuid, PK)
- `trip_id` (FK → Trip)
- `type` (enum: "homestay" | "destination")
- `name` (text)
- `address` (text, nullable)
- `lat` (float)
- `lon` (float)
- `priority` (int 1-5, only for destinations, default 3)
- `source` (enum: "manual" | "google_maps" | "csv")

### DistanceCache
- `id` (uuid, PK)
- `trip_id` (FK → Trip)
- `homestay_id` (FK → Location)
- `destination_id` (FK → Location)
- `straight_line_km` (float)
- `driving_km` (float, nullable)
- `driving_minutes` (float, nullable)

## Data Input Methods

1. **Paste Google Maps link** — regex parse `@lat,lon` from URL, extract place name
2. **Upload CSV/JSON** — parse columns with preview, let user map columns
3. **Manual entry** — type address → Nominatim geocode → confirm pin on map
4. **Click on map** — drop a pin directly on the map

## Ranking Algorithm

```
score(homestay) = Σ (priority[i] × distance[homestay → dest_i]) / Σ priority[i]
```

- Default: straight-line distance (Haversine) — instant, no API
- On-demand: "Check driving time" for selected pairs → OSRM → cache result

## UI Layout

### Desktop — Compare View

```
┌─────────────────────────────────────────────────────────┐
│  Trip Name                       [Share 🔗] [Export 📥] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │              Interactive Map                  │     │
│   │   Click a homestay to see routes to all       │     │
│   │   destinations (color-coded green→red)        │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Ranking: Best → Worst                                  │
│  🥇 Villa Rose      avg 2.5km  [View Routes]           │
│  🥈 Mountain View   avg 3.1km  [View Routes]           │
│  🥉 Cozy Cabin      avg 4.8km  [View Routes]           │
│                                                         │
│  Distance Matrix                            [▼ expand]  │
│  ┌──────────────┬────────┬──────────┬─────────┬────┐   │
│  │              │Crazy H.│Xuan Huong│Valley   │ Avg│   │
│  │ Villa Rose   │ 1.2 km │  3.1 km  │ 3.2 km  │2.5│   │
│  │ Mountain View│ 2.8 km │  2.5 km  │ 4.0 km  │3.1│   │
│  │ Cozy Cabin   │ 5.0 km │  3.5 km  │ 5.9 km  │4.8│   │
│  └──────────────┴────────┴──────────┴─────────┴────┘   │
│             [Check driving time for selected]           │
└─────────────────────────────────────────────────────────┘
```

### Mobile — Bottom Sheet

Map takes full screen. Bottom sheet slides up for ranking + matrix.

### Interactions

- **Click homestay** (list or map) → highlight routes on map, green=close, red=far
- **Hover matrix cell** → highlight that specific route on map
- **Star rating on destinations** → set priority weight 1-5
- **Share button** → generate shareable URL via Supabase share_slug
- **Export** → download trip as CSV/JSON

## Error Handling

- **Nominatim rate limit** (1 req/sec): queue geocode requests, show progress bar
- **OSRM unavailable**: fall back to straight-line only, show notice
- **Invalid Google Maps link**: show "couldn't parse, try pasting coordinates"
- **CSV format mismatch**: show preview before importing, let user map columns

## Pages

- `/` — Landing page with "New Trip" CTA
- `/trip/[slug]` — Trip workspace (add locations, compare, rank)
- `/trip/[slug]/share` — Read-only shared view
