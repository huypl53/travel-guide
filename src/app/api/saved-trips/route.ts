export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import {
  withApiSecurity,
  authLimiter,
  type AuthenticatedContext,
} from "@/lib/api-security";

async function handlePost(
  request: NextRequest,
  _context: unknown,
  auth: AuthenticatedContext,
) {
  const { user, supabase } = auth;
  const { tripId } = await request.json();

  const { error } = await supabase
    .from("saved_trips")
    .insert({ user_id: user.id, trip_id: tripId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleDelete(
  request: NextRequest,
  _context: unknown,
  auth: AuthenticatedContext,
) {
  const { user, supabase } = auth;
  const { tripId } = await request.json();

  const { error } = await supabase
    .from("saved_trips")
    .delete()
    .eq("user_id", user.id)
    .eq("trip_id", tripId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiSecurity(
  { requireAuth: true, rateLimiter: authLimiter },
  handlePost,
);

export const DELETE = withApiSecurity(
  { requireAuth: true, rateLimiter: authLimiter },
  handleDelete,
);
