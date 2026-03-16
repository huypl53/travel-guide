"use client";

import { useMemo } from "react";
import { useTripStore } from "@/store/trip-store";
import { rankHomestays } from "@/lib/ranking";
import { Button } from "@/components/ui/button";

const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export function RankingList() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedId = useTripStore((s) => s.selectedHomestayId);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const ranked = useMemo(() => rankHomestays(homestays, destinations), [homestays, destinations]);

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">Add homestays and destinations to see rankings.</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-sm">Ranking: Best → Worst</h3>
      {ranked.map((r, i) => (
        <Button
          key={r.homestay.id}
          variant={r.homestay.id === selectedId ? "secondary" : "ghost"}
          className="w-full justify-between h-auto py-2"
          onClick={() => setSelected(r.homestay.id)}
        >
          <span>
            {medals[i] ?? `#${i + 1}`} {r.homestay.name}
          </span>
          <span className="text-muted-foreground text-xs">
            avg {r.weightedAvgKm.toFixed(1)} km
          </span>
        </Button>
      ))}
    </div>
  );
}
