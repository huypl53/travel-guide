import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    // Follow redirects manually to get the final URL
    const res = await fetch(url, { redirect: "follow" });
    return NextResponse.json({ resolvedUrl: res.url });
  } catch {
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 502 });
  }
}
