import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { validateLocations } from "@/lib/validate-location";
import { nanoid } from "nanoid";

const MAX_LOCATIONS = 200;
const MAX_NAME_LENGTH = 200;

// --- Rate limiting: max 10 session creations per minute per IP ---
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, valid);
    return true;
  }

  valid.push(now);
  rateLimitMap.set(ip, valid);
  return false;
}

// Periodically clean up stale IPs to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

export async function POST(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many sessions created. Try again later." },
      { status: 429 },
    );
  }

  const supabase = await createSupabaseServer();
  const body = await request.json();
  const { tripName, locations } = body;

  // Validate tripName
  if (tripName && (typeof tripName !== "string" || tripName.length > MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: "Invalid trip name" }, { status: 400 });
  }

  // Validate locations
  if (locations !== undefined) {
    if (!Array.isArray(locations) || locations.length > MAX_LOCATIONS) {
      return NextResponse.json({ error: `Locations must be an array with max ${MAX_LOCATIONS} items` }, { status: 400 });
    }

    const locError = validateLocations(locations);
    if (locError) {
      return NextResponse.json({ error: locError }, { status: 400 });
    }
  }

  const slug = nanoid(10);

  const { data, error } = await supabase
    .from("collaborative_sessions")
    .insert({
      slug,
      trip_name: typeof tripName === "string" ? tripName.slice(0, MAX_NAME_LENGTH) : "Untitled Trip",
      trip_data: locations ?? [],
    })
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slug: data.slug });
}
