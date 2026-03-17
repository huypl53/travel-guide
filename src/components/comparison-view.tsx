"use client";

import { useMemo } from "react";
import { X, GitCompareArrows } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { rankHomestays } from "@/lib/ranking";
import { ComparisonCard } from "@/components/comparison-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ComparisonView({ wrapped }: { wrapped?: boolean } = {}) {
  const locations = useTripStore((s) => s.locations);
  const comparisonIds = useTripStore((s) => s.comparisonIds);
  const clearComparison = useTripStore((s) => s.clearComparison);
  const distances = useDistanceStore((s) => s.distances);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  // Full ranked list to find rank of each comparison homestay
  const allRanked = useMemo(
    () => rankHomestays(homestays, destinations, distances),
    [homestays, destinations, distances]
  );

  // Ranked data for compared homestays only, preserving comparison order
  const comparedData = useMemo(() => {
    return comparisonIds
      .map((id) => {
        const rankIndex = allRanked.findIndex((r) => r.homestay.id === id);
        const ranked = allRanked[rankIndex];
        if (!ranked) return null;
        return { ranked, rank: rankIndex + 1 };
      })
      .filter(Boolean) as { ranked: (typeof allRanked)[0]; rank: number }[];
  }, [comparisonIds, allRanked]);

  // Compute best values across compared homestays
  const bestValues = useMemo(() => {
    if (comparedData.length === 0) return null;

    const bestAvg = Math.min(...comparedData.map((c) => c.ranked.weightedAvgKm));

    const perDestination = new Map<string, { km: number; minutes: number }>();
    if (comparedData[0]) {
      for (const d of comparedData[0].ranked.distances) {
        let bestKm = Infinity;
        let bestMin = Infinity;
        for (const c of comparedData) {
          const dist = c.ranked.distances.find((dd) => dd.destination.id === d.destination.id);
          if (dist) {
            const km = dist.drivingKm ?? dist.km;
            const min = dist.drivingMinutes ?? Infinity;
            if (km < bestKm) bestKm = km;
            if (min < bestMin) bestMin = min;
          }
        }
        perDestination.set(d.destination.id, { km: bestKm, minutes: bestMin });
      }
    }

    const bestTotal = Math.min(
      ...comparedData.map((c) =>
        c.ranked.distances.reduce((sum, d) => sum + (d.drivingMinutes ?? 0), 0)
      )
    );

    return { weightedAvgKm: bestAvg, perDestination, totalMinutes: bestTotal };
  }, [comparedData]);

  // Compute "best for" labels per homestay
  const bestForLabelsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!bestValues || comparedData.length === 0) return map;

    for (const c of comparedData) {
      const labels: string[] = [];
      const id = c.ranked.homestay.id;

      // Check if best weighted average
      if (bestValues.weightedAvgKm > 0 && Math.abs(c.ranked.weightedAvgKm - bestValues.weightedAvgKm) < 0.01) {
        labels.push("Best overall average");
      }

      // Check per-destination
      for (const d of c.ranked.distances) {
        const best = bestValues.perDestination.get(d.destination.id);
        if (best) {
          const km = d.drivingKm ?? d.km;
          if (best.km > 0 && Math.abs(km - best.km) < 0.01) {
            labels.push(`Closest to ${d.destination.name}`);
          }
        }
      }

      // Check total drive time
      const totalMin = c.ranked.distances.reduce(
        (sum, d) => sum + (d.drivingMinutes ?? 0),
        0
      );
      if (totalMin > 0 && bestValues.totalMinutes > 0 && Math.abs(totalMin - bestValues.totalMinutes) < 0.01) {
        labels.push("Shortest total drive");
      }

      map.set(id, labels);
    }

    return map;
  }, [comparedData, bestValues]);

  // Overall winner = lowest weighted average
  const overallWinnerId = comparedData.length > 0
    ? comparedData.reduce((best, c) =>
        c.ranked.weightedAvgKm < best.ranked.weightedAvgKm ? c : best
      ).ranked.homestay.id
    : null;

  if (comparedData.length < 2 || !bestValues) return null;

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base flex items-center gap-1.5">
          <GitCompareArrows className="h-4 w-4" />
          Comparison
        </h3>
        <Button variant="ghost" size="xs" onClick={clearComparison}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 min-w-min">
          {comparedData.map((c) => (
            <ComparisonCard
              key={c.ranked.homestay.id}
              ranked={c.ranked}
              rank={c.rank}
              isOverallWinner={c.ranked.homestay.id === overallWinnerId}
              bestValues={bestValues}
              bestForLabels={bestForLabelsMap.get(c.ranked.homestay.id) ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (wrapped) return <Card className="p-4">{content}</Card>;
  return content;
}
