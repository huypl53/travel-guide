import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour

function getCacheKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

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

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const key = getCacheKey(latNum, lonNum);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latNum));
    url.searchParams.set("longitude", String(lonNum));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,weathercode",
    );
    url.searchParams.set("timezone", "Asia/Ho_Chi_Minh");
    url.searchParams.set("forecast_days", "5");

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Open-Meteo API error" },
        { status: 502 },
      );
    }

    const data = await res.json();
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 },
    );
  }
}
