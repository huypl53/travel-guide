import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { MyTripsList } from "@/components/my-trips-list";
import type { TripCardData } from "@/lib/types";
import { rankHomestays } from "@/lib/ranking";

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

  function toCardData(
    trip: {
      id: string;
      name: string;
      share_slug: string;
      created_at: string;
      locations: { type: string; name: string; lat: number; lon: number; priority: number }[];
    },
    isSaved: boolean
  ): TripCardData {
    const homestays = trip.locations?.filter((l) => l.type === "homestay") ?? [];
    const destinations = trip.locations?.filter((l) => l.type === "destination") ?? [];

    let topHomestay: string | null = null;
    if (homestays.length > 0 && destinations.length > 0) {
      const ranked = rankHomestays(
        homestays.map((h, i) => ({
          id: `h${i}`, tripId: "", type: "homestay" as const,
          name: h.name, address: null, lat: h.lat, lon: h.lon,
          priority: 3, source: "manual" as const, notes: null, photoUrl: null,
        })),
        destinations.map((d, i) => ({
          id: `d${i}`, tripId: "", type: "destination" as const,
          name: d.name, address: null, lat: d.lat, lon: d.lon,
          priority: d.priority, source: "manual" as const, notes: null, photoUrl: null,
        }))
      );
      topHomestay = ranked[0]?.homestay.name ?? null;
    }

    return {
      id: trip.id,
      name: trip.name || "Untitled Trip",
      shareSlug: trip.share_slug,
      createdAt: trip.created_at,
      homestayCount: homestays.length,
      destinationCount: destinations.length,
      topHomestay,
      isSaved,
    };
  }

  const tripCards: TripCardData[] = [
    ...(ownTrips ?? []).map((t) => toCardData(t, false)),
    ...(savedRows ?? [])
      .filter((r) => r.trips)
      .map((r) => toCardData(r.trips as unknown as {
        id: string; name: string; share_slug: string; created_at: string;
        locations: { type: string; name: string; lat: number; lon: number; priority: number }[];
      }, true)),
  ];

  return <MyTripsList initialTrips={tripCards} />;
}
