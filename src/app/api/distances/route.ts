export const maxDuration = 5;

import { NextRequest, NextResponse } from "next/server";
import { getRoutingProvider } from "@/lib/map-providers";
import { withApiSecurity, publicProxyLimiter } from "@/lib/api-security";

const MAX_COORDINATES = 100;

function parseCoords(param: string) {
  return param.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });
}

function hasInvalidCoords(coords: { lat: number; lon: number }[]) {
  return coords.some((c) => isNaN(c.lat) || isNaN(c.lon));
}

async function handleGet(request: NextRequest) {
  const sourcesParam = request.nextUrl.searchParams.get("sources"); // "lat,lon;lat,lon"
  const destsParam = request.nextUrl.searchParams.get("destinations");

  if (!sourcesParam || !destsParam) {
    return NextResponse.json({ error: "Missing sources/destinations" }, { status: 400 });
  }

  const sources = parseCoords(sourcesParam);
  const destinations = parseCoords(destsParam);

  if (hasInvalidCoords(sources) || hasInvalidCoords(destinations)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (sources.length + destinations.length > MAX_COORDINATES) {
    return NextResponse.json({ error: `Too many coordinates (max ${MAX_COORDINATES})` }, { status: 400 });
  }

  try {
    const provider = getRoutingProvider();
    const matrix = await provider.getDistanceMatrix(sources, destinations);
    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ error: "Distance matrix request failed" }, { status: 502 });
  }
}

export const GET = withApiSecurity({ rateLimiter: publicProxyLimiter }, handleGet);
