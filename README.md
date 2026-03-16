# Homestay Locator

Find the best homestay based on proximity to the places you want to visit. Add homestays and destinations on a map, compare distances, and rank options automatically.

## Features

- Interactive map with color-coded markers and distance polylines
- Automatic ranking of homestays by weighted average distance to destinations
- Pairwise distance matrix with on-demand driving time via OSRM
- Priority weighting for destinations (1-5 stars)
- Multiple input methods: Google Maps URLs (full and short links), CSV, JSON, and manual coordinates
- Share trips via unique URLs backed by Supabase
- Export trip data as JSON
- Mobile-responsive layout with collapsible bottom sheet

## Authentication

- **Google OAuth** and **magic link** (passwordless email) sign-in via Supabase Auth
- **"My Trips" dashboard** on the landing page for logged-in users — view and manage all your saved trips
- **Save shared trips** to your account with one click when viewing someone else's trip
- **No login required** — anonymous users retain full access to create and share trips

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** with **Zustand** for state management
- **Leaflet** / react-leaflet for interactive maps
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

1. **Landing page** (`/`) -- Click "New Trip" to create a trip workspace with a unique URL.
2. **Trip page** (`/trip/[slug]`) -- The main workspace where you:
   - Add **homestays** and **destinations** using the input panels (supports Google Maps URLs, CSV, JSON, and manual entry).
   - Set **priority** (1-5 stars) on destinations to weight the ranking.
   - View all locations on an interactive **map** with color-coded markers and distance polylines.
   - See the **ranking list** showing homestays sorted by weighted average distance.
   - Inspect the **distance matrix** for pairwise distances. Click "drive?" in any cell to fetch driving distance and time via OSRM.
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
