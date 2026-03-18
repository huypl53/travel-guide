import type { TripCardData } from "@/lib/types";
import { rankBases } from "@/lib/ranking";

export interface TripRow {
  id: string;
  name: string;
  share_slug: string;
  created_at: string;
  locations: { type: string; name: string; lat: number; lon: number; priority: number }[];
}

export function toCardData(trip: TripRow, isSaved: boolean): TripCardData {
  const bases = trip.locations?.filter((l) => l.type === "base") ?? [];
  const destinations = trip.locations?.filter((l) => l.type === "destination") ?? [];

  let topBase: string | null = null;
  if (bases.length > 0 && destinations.length > 0) {
    const ranked = rankBases(
      bases.map((h, i) => ({
        id: `h${i}`, tripId: "", type: "base" as const,
        name: h.name, address: null, lat: h.lat, lon: h.lon,
        priority: 3, source: "manual" as const, notes: null, photoUrl: null,
      })),
      destinations.map((d, i) => ({
        id: `d${i}`, tripId: "", type: "destination" as const,
        name: d.name, address: null, lat: d.lat, lon: d.lon,
        priority: d.priority, source: "manual" as const, notes: null, photoUrl: null,
      }))
    );
    topBase = ranked[0]?.base.name ?? null;
  }

  return {
    id: trip.id,
    name: trip.name || "Untitled Trip",
    shareSlug: trip.share_slug,
    createdAt: trip.created_at,
    baseCount: bases.length,
    destinationCount: destinations.length,
    topBase,
    isSaved,
  };
}
