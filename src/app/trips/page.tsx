import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { MyTripsList } from "@/components/my-trips-list";
import type { TripCardData } from "@/lib/types";
import { toCardData, type TripRow } from "@/lib/trip-card";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch user's own trips
  const { data: ownTrips } = await supabase
    .from("trips")
    .select("id, name, share_slug, created_at, locations(type, name, lat, lon, priority)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch saved trips
  const { data: savedRows } = await supabase
    .from("saved_trips")
    .select("trip_id, trips(id, name, share_slug, created_at, locations(type, name, lat, lon, priority))")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const tripCards: TripCardData[] = [
    ...(ownTrips ?? []).map((t) => toCardData(t, false)),
    ...(savedRows ?? [])
      .filter((r) => r.trips)
      .map((r) => toCardData(r.trips as unknown as TripRow, true)),
  ];

  return <MyTripsList initialTrips={tripCards} />;
}
