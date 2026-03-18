"use client";

import { Trophy, Car, MapPin } from "lucide-react";
import type { RankedHomestay } from "@/lib/types";

interface BestValues {
  weightedAvgKm: number;
  perDestination: Map<string, { km: number; minutes: number }>;
  totalMinutes: number;
}

interface ComparisonCardProps {
  ranked: RankedHomestay;
  rank: number;
  isOverallWinner: boolean;
  bestValues: BestValues;
  bestForLabels: string[];
}

function RankBadge({ rank }: { rank: number }) {
  const base = "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold";
  if (rank === 1) return <div className={`${base} bg-amber-500 text-white`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gray-400 text-white`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-amber-700 text-white`}>3</div>;
  return <div className={`${base} bg-muted text-muted-foreground`}>{rank}</div>;
}

function isBest(value: number, best: number): boolean {
  return Math.abs(value - best) < 0.01;
}

export function ComparisonCard({ ranked, rank, isOverallWinner, bestValues, bestForLabels }: ComparisonCardProps) {
  const totalMinutes = ranked.distances.reduce(
    (sum, d) => sum + (d.drivingMinutes ?? 0),
    0
  );

  return (
    <div
      className={`flex flex-col rounded-lg border p-4 min-w-[200px] ${
        isOverallWinner ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <RankBadge rank={rank} />
        <h4 className={`text-sm font-semibold truncate ${isOverallWinner ? "text-primary font-bold" : ""}`}>
          {ranked.homestay.name}
        </h4>
        {isOverallWinner && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
      </div>

      {/* Weighted average */}
      <div
        className={`text-center py-2 rounded-md mb-3 ${
          bestValues.weightedAvgKm > 0 && isBest(ranked.weightedAvgKm, bestValues.weightedAvgKm)
            ? "bg-green-500/15 text-green-700 dark:text-green-400"
            : "bg-muted"
        }`}
      >
        <div className="text-xs text-muted-foreground">Weighted Avg</div>
        <div className="text-lg font-bold">{ranked.weightedAvgKm.toFixed(1)} km</div>
      </div>

      {/* Per-destination breakdown */}
      <div className="space-y-2 flex-1">
        {ranked.distances.map((d) => {
          const effectiveKm = d.drivingKm ?? d.km;
          const effectiveMin = d.drivingMinutes ?? 0;
          const bestDest = bestValues.perDestination.get(d.destination.id);
          const isBestKm = bestDest && bestDest.km > 0 ? isBest(effectiveKm, bestDest.km) : false;
          const isBestMin = bestDest && bestDest.minutes > 0 && effectiveMin > 0 ? isBest(effectiveMin, bestDest.minutes) : false;

          return (
            <div key={d.destination.id} className="border-t border-border/50 pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{d.destination.name}</span>
              </div>
              <div className="flex gap-3 text-sm">
                <span
                  className={`flex items-center gap-1 ${
                    isBestKm ? "text-green-700 dark:text-green-400 font-semibold" : ""
                  }`}
                >
                  <Car className="h-3 w-3" />
                  {effectiveKm.toFixed(1)} km
                </span>
                {effectiveMin > 0 && (
                  <span
                    className={
                      isBestMin ? "text-green-700 dark:text-green-400 font-semibold" : "text-muted-foreground"
                    }
                  >
                    {effectiveMin.toFixed(0)} min
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total driving time */}
      {totalMinutes > 0 && (
        <div
          className={`text-center py-2 rounded-md mt-3 ${
            bestValues.totalMinutes > 0 && isBest(totalMinutes, bestValues.totalMinutes)
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-muted"
          }`}
        >
          <div className="text-xs text-muted-foreground">Total Drive Time</div>
          <div className="text-base font-bold">{totalMinutes.toFixed(0)} min</div>
        </div>
      )}

      {/* Best for labels */}
      {bestForLabels.length > 0 && (
        <div className="mt-3 space-y-1">
          {bestForLabels.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className="text-xs text-green-700 dark:text-green-400 bg-green-500/10 rounded px-2 py-1"
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
