import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (error || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
