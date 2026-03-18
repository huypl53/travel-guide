export const maxDuration = 5;

import { NextRequest, NextResponse } from "next/server";
import { withApiSecurity, publicProxyLimiter } from "@/lib/api-security";

async function handleGet(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from"); // "lat,lon"
  const to = request.nextUrl.searchParams.get("to"); // "lat,lon"

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to parameters" }, { status: 400 });
  }

  const [fromLat, fromLon] = from.split(",");
  const [toLat, toLon] = to.split(",");

  // OSRM expects lon,lat order
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Routing failed" }, { status: 502 });
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    return NextResponse.json({ error: "No route found" }, { status: 404 });
  }

  const route = data.routes[0];
  return NextResponse.json({
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  });
}

export const GET = withApiSecurity({ rateLimiter: publicProxyLimiter }, handleGet);
