export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { validateLocations } from "@/lib/validate-location";
import { nanoid } from "nanoid";
import { withApiSecurity, collabCreateLimiter } from "@/lib/api-security";

const MAX_LOCATIONS = 200;
const MAX_NAME_LENGTH = 200;

async function handlePost(request: NextRequest) {
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

export const POST = withApiSecurity(
  { rateLimiter: collabCreateLimiter, maxBodySize: 524288 },
  handlePost,
);
