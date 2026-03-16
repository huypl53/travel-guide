# Homestay Locator

Find the best homestay based on proximity to the places you want to visit. Add homestays and destinations, and the app ranks them for you.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Usage

1. **Landing page** (`/`) - Click "New Trip" to create a trip workspace with a unique shareable URL.
2. **Trip page** (`/trip/[slug]`) - The main workspace where you:
   - Add **homestays** and **destinations** using the location input panels (supports Google Maps URLs, CSV, JSON, and manual entry).
   - View all locations on an interactive **map** with color-coded markers and distance polylines.
   - See the **ranking list** showing homestays sorted by average distance to destinations.
   - Inspect the **distance matrix** for detailed pairwise distances.
   - Use **Share** and **Export** buttons in the header.

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run test      # Run tests (vitest)
```

## Tech Stack

- **Next.js 15** (App Router)
- **React 19** with Zustand for state management
- **Leaflet** / react-leaflet for maps
- **Supabase** for persistence
- **shadcn/ui** components
- **Tailwind CSS** for styling
