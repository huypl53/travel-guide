export const maxDuration = 5;

import { NextRequest, NextResponse } from "next/server";
import {
  type PoiCategory,
  type PoiResult,
  allCategories,
  buildOverpassQuery,
  classifyElement,
  haversineMeters,
} from "@/lib/overpass";
import { withApiSecurity, nearbyLimiter } from "@/lib/api-security";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: PoiResult[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Simple mutex to avoid concurrent Overpass requests (rate limit policy)
let pending: Promise<unknown> = Promise.resolve();
let lastRequestTime = 0;

function cacheKey(lat: number, lon: number, radius: number, categories: string): string {
  // Round coords to ~11m precision to improve cache hits
  return `${lat.toFixed(4)},${lon.toFixed(4)},${radius},${categories}`;
}

async function queryOverpass(
  lat: number,
  lon: number,
  radius: number,
  categories: PoiCategory[],
): Promise<PoiResult[]> {
  // Enforce 2-second gap between Overpass requests
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
  }
  lastRequestTime = Date.now();

  const query = buildOverpassQuery(lat, lon, radius, categories);

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const json = await res.json();
  const elements: { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] =
    json.elements ?? [];

  return elements
    .map((el) => {
      const category = classifyElement(el.tags ?? {});
      if (!category) return null;
      // For ways/relations, use the centroid from `out center`
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) return null;
      return {
        category,
        name: el.tags?.name || el.tags?.["name:en"] || category,
        lat: elLat,
        lon: elLon,
        distance: Math.round(haversineMeters(lat, lon, elLat, elLon)),
      };
    })
    .filter((p): p is PoiResult => p !== null)
    .sort((a, b) => a.distance - b.distance);
}

async function handleGet(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const lat = parseFloat(sp.get("lat") ?? "");
  const lon = parseFloat(sp.get("lon") ?? "");
  const radius = Math.min(Math.max(parseInt(sp.get("radius") ?? "1000", 10), 100), 5000);
  const categoriesParam = sp.get("categories") ?? "";

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const categories = categoriesParam
    .split(",")
    .filter((c): c is PoiCategory => allCategories.includes(c as PoiCategory));

  if (categories.length === 0) {
    return NextResponse.json({ error: "No valid categories" }, { status: 400 });
  }

  const key = cacheKey(lat, lon, radius, categories.sort().join(","));

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ pois: cached.data });
  }

  try {
    // Serialize requests to respect Overpass rate limits
    const result = await (pending = pending
      .catch(() => {})
      .then(() => queryOverpass(lat, lon, radius, categories)));

    const pois = (result as PoiResult[]).slice(0, 200);
    cache.set(key, { data: pois, timestamp: Date.now() });

    // Evict old cache entries
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.timestamp > CACHE_TTL) cache.delete(k);
      }
    }

    return NextResponse.json({ pois });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch nearby POIs" },
      { status: 502 },
    );
  }
}

export const GET = withApiSecurity({ rateLimiter: nearbyLimiter }, handleGet);
