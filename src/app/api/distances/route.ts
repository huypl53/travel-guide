import { NextRequest, NextResponse } from "next/server";
import { buildOsrmTableUrl, parseTableResponse } from "@/lib/osrm";

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

export async function GET(request: NextRequest) {
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

  const url = buildOsrmTableUrl(sources, destinations);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "OSRM table request failed" }, { status: 502 });
    }

    const data = await res.json();
    if (data.code !== "Ok") {
      return NextResponse.json({ error: "OSRM error: " + data.code }, { status: 502 });
    }

    const matrix = parseTableResponse(data, sources.length, destinations.length);

    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ error: "Failed to reach OSRM server" }, { status: 502 });
  }
}
