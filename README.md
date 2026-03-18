# Homestay Locator

Find the best homestay based on proximity to the places you want to visit. Add homestays and destinations on a map, compare distances, and rank options automatically.

## Screenshots

### Landing Page

![Landing Page](/public/screenshots/landing-page.png)

### Trip Workspace

Add homestays and destinations, see them on the map with driving route polylines, and get automatic rankings.

![Trip Workspace](/public/screenshots/trip-workspace.png)

### Distance Matrix

View pairwise driving distances and durations between all homestays and destinations.

![Distance Matrix](/public/screenshots/distance-matrix.png)

### Mobile View

Fully responsive layout with collapsible bottom sheet for rankings.

![Mobile View](/public/screenshots/mobile-view.png)

## Features

- Interactive map with color-coded markers and actual driving route polylines (Leaflet/OSM or Google Maps)
- Map style switcher — toggle between Default, Satellite, Terrain, and Dark map styles (persists across reloads)
- Automatic ranking of homestays by weighted average distance to destinations
- Real driving distances via OSRM Table API, auto-fetched when locations change (haversine fallback)
- Priority weighting for destinations (1-5 stars)
- Multi-select with visual comparison — toggle homestays/destinations on/off to dim unselected items across all views (lists, map markers, routes, ranking, distance matrix)
- Scrollable location lists for handling many locations
- Concurrency-limited route fetching (max 3 parallel requests) with persistent route cache
- Cost estimation — enter nightly rates per homestay, set trip duration and transport mode (motorbike/car), see total cost badges with accommodation + transport breakdown; cheapest highlighted green, most expensive red
- Location notes and photo URLs — add context per location, visible in lists and map popups
- Multiple input methods: Google Maps URLs (full and short links), CSV, JSON, and manual coordinates
- Share trips via unique URLs backed by Supabase
- Export trip data as JSON
- Mobile-responsive layout with collapsible bottom sheet
- Pre-built Vietnam trip templates -- browse curated itineraries and clone one as a starting point

## Authentication

- **Google OAuth** and **magic link** (passwordless email) sign-in via Supabase Auth
- **"My Trips" dashboard** on the landing page for logged-in users — view and manage all your saved trips
- **Save shared trips** to your account with one click when viewing someone else's trip
- **No login required** — anonymous users retain full access to create and share trips

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** with **Zustand** for state management
- **Leaflet** / react-leaflet for interactive maps (default), **Google Maps** via `@vis.gl/react-google-maps` (optional)
- **Supabase** for persistence (trips, locations, distance cache)
- **shadcn/ui** + **Tailwind CSS** for styling
- **Vitest** + Testing Library for tests
- **Nominatim** for geocoding, **OSRM** for driving directions

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Install

```bash
git clone <repo-url>
cd map-locator
npm install
```

### Environment Setup

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Google Maps (defaults to Leaflet/OSM if not set)
NEXT_PUBLIC_MAP_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the migration in the Supabase SQL Editor (or via the CLI):

```bash
# Using Supabase CLI
supabase db push

# Or manually paste the contents of supabase/migrations/001_initial.sql
# into the SQL Editor in the Supabase dashboard.
```

This creates three tables: `trips`, `locations`, and `distance_cache`.

3. Copy your project URL and anon key into `.env.local`.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Usage

1. **Landing page** (`/`) -- Click "New Trip" to create a trip workspace with a unique URL, or browse **Trip Templates** to start from a curated Vietnam itinerary with pre-populated homestays and destinations.
2. **Trip page** (`/trip/[slug]`) -- The main workspace where you:
   - Add **homestays** and **destinations** using the input panels (supports Google Maps URLs, CSV, JSON, and manual entry).
   - Set **priority** (1-5 stars) on destinations to weight the ranking.
   - Expand a location row to add **notes** and a **photo URL** — notes auto-save on blur, photos display as thumbnails with broken-image fallback.
   - View all locations on an interactive **map** with color-coded markers and distance polylines.
   - See the **ranking list** showing homestays sorted by weighted average distance. Enter **nightly rates** (VND) per homestay, set **trip nights** and **transport mode** (motorbike at 3,000 VND/km or car at 6,000 VND/km) to see total cost badges with breakdown tooltips. Settings persist in localStorage.
   - Inspect the **distance matrix** for pairwise distances — driving distances and times are fetched automatically via OSRM and shown with a car icon.
   - Click **Share** to save the trip to Supabase and copy a shareable read-only link.
   - Click **Export** to download the trip data as a JSON file.
   - On mobile, rankings and distance matrix appear in a collapsible bottom sheet panel.

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests (vitest)
npm run test:watch   # Run tests in watch mode
```

## Documentation

- [Architecture](docs/architecture.md) — System overview, component descriptions, tech stack
- [Developer Guide](docs/specs/developer-guide.md) — Project structure, setup, conventions, how to add features
- [User Flows](docs/specs/user-flows.md) — Step-by-step flows for every user action
- [API Reference](docs/specs/api-reference.md) — All API endpoints with params and responses
- [Data Model](docs/specs/data-model.md) — Database schema, Zustand stores, TypeScript types, ranking algorithm
