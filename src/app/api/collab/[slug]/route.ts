import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { validateLocations } from "@/lib/validate-location";

const MAX_LOCATIONS = 200;
const MAX_NAME_LENGTH = 200;
const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,21}$/;

function validateSlug(slug: string) {
  return SLUG_PATTERN.test(slug);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!validateSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("collaborative_sessions")
    .select("slug, trip_name, trip_data, updated_at, expires_at")
    .eq("slug", slug)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }

  return NextResponse.json({
    slug: data.slug,
    tripName: data.trip_name,
    tripData: data.trip_data,
    updatedAt: data.updated_at,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!validateSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const supabase = await createSupabaseServer();
  const body = await request.json();

  // Validate inputs
  if (body.tripName !== undefined) {
    if (typeof body.tripName !== "string" || body.tripName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Invalid trip name" }, { status: 400 });
    }
  }
  if (body.tripData !== undefined) {
    if (!Array.isArray(body.tripData) || body.tripData.length > MAX_LOCATIONS) {
      return NextResponse.json({ error: `tripData must be an array with max ${MAX_LOCATIONS} items` }, { status: 400 });
    }

    const locError = validateLocations(body.tripData);
    if (locError) {
      return NextResponse.json({ error: locError }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.tripName !== undefined) updates.trip_name = body.tripName;
  if (body.tripData !== undefined) updates.trip_data = body.tripData;

  const { data, error } = await supabase
    .from("collaborative_sessions")
    .update(updates)
    .eq("slug", slug)
    .gt("expires_at", new Date().toISOString())
    .select("slug");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
