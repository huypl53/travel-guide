import { NextRequest, NextResponse } from "next/server";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing lat/lon parameters" },
      { status: 400 },
    );
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json(
      { error: "Invalid lat/lon values" },
      { status: 400 },
    );
  }

  // Round to 2 decimal places for cache key (roughly 1km precision)
  const cacheKey = `${latNum.toFixed(2)},${lonNum.toFixed(2)}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latNum));
    url.searchParams.set("longitude", String(lonNum));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
    );
    url.searchParams.set("timezone", "Asia/Ho_Chi_Minh");
    url.searchParams.set("forecast_days", "5");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Open-Meteo API error" },
        { status: 502 },
      );
    }

    const data = await res.json();

    cache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS });

    // Evict expired entries periodically
    if (cache.size > 100) {
      for (const [key, entry] of cache) {
        if (entry.expiresAt <= now) cache.delete(key);
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 },
    );
  }
}
