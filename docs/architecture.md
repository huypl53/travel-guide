# Architecture

## Utility Libraries (`src/lib/`)

### Parsers (`src/lib/parsers.ts`)

Location parsing utilities for multiple input formats:

- **`parseGoogleMapsUrl(url)`** - Extracts lat/lon/name from Google Maps URLs (supports `@lat,lon` and `?q=lat,lon` formats).
- **`parseCsvLocations(csv)`** - Parses CSV text with `name,lat,lon` columns (optional `address` column). Skips rows with invalid coordinates.
- **`parseJsonLocations(json)`** - Parses a JSON string containing an array of `{name, lat, lon, address?}` objects. Returns empty array on invalid input.

All parsers return structured location objects and handle malformed input gracefully.
