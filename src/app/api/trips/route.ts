import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const body = await request.json();
  const { name, locations } = body;

  if (!name) {
    return NextResponse.json({ error: "Missing trip name" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slug = nanoid(10);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({ name, share_slug: slug, user_id: user?.id ?? null })
    .select()
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  if (locations?.length > 0) {
    const rows = locations.map(
      (loc: {
        type: string;
        name: string;
        address?: string;
        lat: number;
        lon: number;
        priority?: number;
        source?: string;
      }) => ({
        trip_id: trip.id,
        type: loc.type,
        name: loc.name,
        address: loc.address ?? null,
        lat: loc.lat,
        lon: loc.lon,
        priority: loc.priority ?? 3,
        source: loc.source ?? "manual",
      })
    );

    const { error: locError } = await supabase.from("locations").insert(rows);
    if (locError) {
      return NextResponse.json({ error: locError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug: trip.share_slug, id: trip.id });
}
