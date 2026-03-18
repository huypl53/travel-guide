export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  withApiSecurity,
  authLimiter,
  type AuthenticatedContext,
} from "@/lib/api-security";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

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

async function handlePatch(
  request: NextRequest,
  context: unknown,
  auth: AuthenticatedContext,
) {
  const { slug } = await (context as { params: Promise<{ slug: string }> }).params;
  const { user, supabase } = auth;

  const { name } = await request.json();
  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("share_slug", slug)
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("trips")
    .update({ name: name.trim() })
    .eq("id", trip.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const trimmed = name.trim();
  return NextResponse.json({ ok: true, name: trimmed });
}

async function handleDelete(
  _request: NextRequest,
  context: unknown,
  auth: AuthenticatedContext,
) {
  const { slug } = await (context as { params: Promise<{ slug: string }> }).params;
  const { user, supabase } = auth;

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("share_slug", slug)
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  if (trip.user_id === user.id) {
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("saved_trips")
      .delete()
      .eq("user_id", user.id)
      .eq("trip_id", trip.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiSecurity(
  { requireAuth: true, rateLimiter: authLimiter },
  handlePatch,
);

export const DELETE = withApiSecurity(
  { requireAuth: true, rateLimiter: authLimiter },
  handleDelete,
);
