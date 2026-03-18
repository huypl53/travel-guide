export const maxDuration = 5;

import { NextRequest, NextResponse } from "next/server";
import { withApiSecurity, resolveUrlLimiter } from "@/lib/api-security";

const ALLOWED_HOSTS = [
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
];

async function handleGet(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL host not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    const resolvedHost = new URL(res.url).hostname;
    if (!ALLOWED_HOSTS.includes(resolvedHost) && !resolvedHost.endsWith(".google.com")) {
      return NextResponse.json({ error: "Redirect target not allowed" }, { status: 403 });
    }
    return NextResponse.json({ resolvedUrl: res.url });
  } catch {
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 502 });
  }
}

export const GET = withApiSecurity({ rateLimiter: resolveUrlLimiter }, handleGet);
