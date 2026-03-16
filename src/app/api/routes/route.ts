import { NextRequest, NextResponse } from "next/server";
import { buildOsrmRouteUrl } from "@/lib/osrm";

export async function GET(request: NextRequest) {
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

  const url = buildOsrmRouteUrl({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon });

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "OSRM route request failed" }, { status: 502 });
    }

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry) {
      return NextResponse.json({ error: "No route found" }, { status: 502 });
    }

    return NextResponse.json({ geometry: data.routes[0].geometry });
  } catch {
    return NextResponse.json({ error: "Failed to reach OSRM server" }, { status: 502 });
  }
}
