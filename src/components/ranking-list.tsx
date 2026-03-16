"use client";

import { useMemo } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { rankHomestays } from "@/lib/ranking";
import { Button } from "@/components/ui/button";

function RankBadge({ rank }: { rank: number }) {
  const base = "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold";
  if (rank === 1) return <div className={`${base} bg-amber-500 text-white`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gray-400 text-white`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-amber-700 text-white`}>3</div>;
  return <div className={`${base} bg-muted text-muted-foreground`}>{rank}</div>;
}

export function RankingList() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedId = useTripStore((s) => s.selectedHomestayId);

  const distances = useDistanceStore((s) => s.distances);
  const distancesLoading = useDistanceStore((s) => s.loading);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const ranked = useMemo(() => rankHomestays(homestays, destinations, distances), [homestays, destinations, distances]);

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">Add homestays and destinations to see rankings.</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-base flex items-center gap-1.5">
        <Trophy className="h-4 w-4" />
        Ranking: Best → Worst
      </h3>
      {ranked.map((r, i) => (
        <Button
          key={r.homestay.id}
          variant={r.homestay.id === selectedId ? "secondary" : "ghost"}
          className="w-full justify-between h-auto py-2"
          onClick={() => setSelected(r.homestay.id)}
        >
          <span className="flex items-center gap-2">
            <RankBadge rank={i + 1} />
            {r.homestay.name}
          </span>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            {distancesLoading && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            avg {r.weightedAvgKm.toFixed(1)} km
          </span>
        </Button>
      ))}
    </div>
  );
}
