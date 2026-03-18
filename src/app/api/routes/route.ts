export const maxDuration = 5;

import { NextRequest, NextResponse } from "next/server";
import { getRoutingProvider } from "@/lib/map-providers";
import { withApiSecurity, publicProxyLimiter } from "@/lib/api-security";

async function handleGet(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from"); // "lat,lon"
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const [fromLat, fromLon] = fromParam.split(",").map(Number);
  const [toLat, toLon] = toParam.split(",").map(Number);

  if ([fromLat, fromLon, toLat, toLon].some(isNaN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const provider = getRoutingProvider();
    const result = await provider.getRoute({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon });
    if (!result) {
      return NextResponse.json({ error: "No route found" }, { status: 502 });
    }
    return NextResponse.json({ geometry: result.geometry });
  } catch {
    return NextResponse.json({ error: "Route request failed" }, { status: 502 });
  }
}

export const GET = withApiSecurity({ rateLimiter: publicProxyLimiter }, handleGet);
