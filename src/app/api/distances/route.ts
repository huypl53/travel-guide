import { NextRequest, NextResponse } from "next/server";
import { buildOsrmTableUrl, parseTableResponse } from "@/lib/osrm";

export async function GET(request: NextRequest) {
  const sourcesParam = request.nextUrl.searchParams.get("sources"); // "lat,lon;lat,lon"
  const destsParam = request.nextUrl.searchParams.get("destinations");

  if (!sourcesParam || !destsParam) {
    return NextResponse.json({ error: "Missing sources/destinations" }, { status: 400 });
  }

  const sources = sourcesParam.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });

  const destinations = destsParam.split(";").map((s) => {
    const [lat, lon] = s.split(",").map(Number);
    return { lat, lon };
  });

  const url = buildOsrmTableUrl(sources, destinations);

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
}
