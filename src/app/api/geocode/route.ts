import { NextRequest, NextResponse } from "next/server";
import { getGeocodingProvider } from "@/lib/map-providers";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const provider = getGeocodingProvider();
    const results = await provider.search(query, { country: "vn" });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
