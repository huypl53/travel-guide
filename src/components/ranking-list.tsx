"use client";

import { useMemo, useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { useCostStore } from "@/store/cost-store";
import { rankHomestays } from "@/lib/ranking";
import { formatVND, calculateCost } from "@/components/cost-estimator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function RankBadge({ rank }: { rank: number }) {
  const base = "inline-flex items-center justify-center h-8 w-8 sm:h-6 sm:w-6 rounded-full text-xs font-bold";
  if (rank === 1) return <div className={`${base} bg-amber-500 text-white`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gray-400 text-white`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-amber-700 text-white`}>3</div>;
  return <div className={`${base} bg-muted text-muted-foreground`}>{rank}</div>;
}

function NightlyRateInput({ homestayId, homestayName }: { homestayId: string; homestayName: string }) {
  const rate = useCostStore((s) => s.nightlyRates[homestayId]);
  const setNightlyRate = useCostStore((s) => s.setNightlyRate);
  const removeNightlyRate = useCostStore((s) => s.removeNightlyRate);
  const [draft, setDraft] = useState(rate ? String(rate) : "");
  const [isFocused, setIsFocused] = useState(false);

  // When not focused, derive display value from store (handles loadFromStorage)
  const displayValue = isFocused ? draft : (rate ? String(rate) : "");

  function handleFocus() {
    setIsFocused(true);
    setDraft(rate ? String(rate) : "");
  }

  function handleBlur() {
    setIsFocused(false);
    const num = Number(draft.replace(/\D/g, ""));
    if (num > 0) {
      setNightlyRate(homestayId, num);
    } else {
      removeNightlyRate(homestayId);
      setDraft("");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setDraft(raw);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue ? formatVND(Number(displayValue)) : ""}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="VND/night"
      className="w-24 h-7 sm:h-6 text-xs text-right"
      aria-label={`Nightly rate for ${homestayName}`}
    />
  );
}

function CostBadge({
  totalCost,
  transportCost,
  accommodationCost,
  isCheapest,
  isMostExpensive,
}: {
  totalCost: number;
  transportCost: number;
  accommodationCost: number;
  isCheapest: boolean;
  isMostExpensive: boolean;
}) {
  const colorClass = isCheapest
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    : isMostExpensive
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${colorClass} cursor-help`}
      title={`Accommodation: ${formatVND(accommodationCost)} VND\nTransport: ${formatVND(transportCost)} VND`}
    >
      {formatVND(totalCost)} VND
    </span>
  );
}

export function RankingList() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedId = useTripStore((s) => s.selectedHomestayId);
  const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
  const setFocusedLocation = useTripStore((s) => s.setFocusedLocation);

  const distances = useDistanceStore((s) => s.distances);
  const distancesLoading = useDistanceStore((s) => s.loading);

  const nightlyRates = useCostStore((s) => s.nightlyRates);
  const tripNights = useCostStore((s) => s.tripNights);
  const fuelCostPerKm = useCostStore((s) => s.fuelCostPerKm);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const ranked = useMemo(() => rankHomestays(homestays, destinations, distances), [homestays, destinations, distances]);

  // Compute costs for homestays that have nightly rates
  const costData = useMemo(() => {
    const costs: Record<string, { transportCost: number; accommodationCost: number; totalCost: number }> = {};
    for (const r of ranked) {
      const rate = nightlyRates[r.homestay.id];
      if (rate == null || rate <= 0) continue;

      const totalDrivingKm = r.distances.reduce((sum, d) => {
        return sum + (d.drivingKm ?? d.km);
      }, 0);

      costs[r.homestay.id] = calculateCost(totalDrivingKm, rate, tripNights, fuelCostPerKm);
    }
    return costs;
  }, [ranked, nightlyRates, tripNights, fuelCostPerKm]);

  // Find cheapest and most expensive among those with cost data
  const { cheapestId, mostExpensiveId } = useMemo(() => {
    const entries = Object.entries(costData);
    if (entries.length < 2) return { cheapestId: null, mostExpensiveId: null };

    let cheapest = entries[0];
    let mostExpensive = entries[0];
    for (const entry of entries) {
      if (entry[1].totalCost < cheapest[1].totalCost) cheapest = entry;
      if (entry[1].totalCost > mostExpensive[1].totalCost) mostExpensive = entry;
    }
    if (cheapest[1].totalCost === mostExpensive[1].totalCost) return { cheapestId: null, mostExpensiveId: null };
    return { cheapestId: cheapest[0], mostExpensiveId: mostExpensive[0] };
  }, [costData]);

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">Add homestays and destinations to see rankings.</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-base flex items-center gap-1.5">
        <Trophy className="h-4 w-4" />
        Ranking: Best &rarr; Worst
      </h3>
      {ranked.map((r, i) => {
        const cost = costData[r.homestay.id];

        return (
          <div key={r.homestay.id} className="space-y-1">
            <Button
              variant={r.homestay.id === selectedId ? "secondary" : "ghost"}
              className={`w-full justify-between h-auto py-3 sm:py-2 ${
                !selectedHomestayIds.has(r.homestay.id) ? "opacity-40" : ""
              }`}
              onClick={() => {
                setSelected(r.homestay.id);
                setFocusedLocation({ lat: r.homestay.lat, lon: r.homestay.lon });
              }}
            >
              <span className="flex items-center gap-2">
                <RankBadge rank={i + 1} />
                <span className="truncate">{r.homestay.name}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {cost && (
                  <CostBadge
                    totalCost={cost.totalCost}
                    transportCost={cost.transportCost}
                    accommodationCost={cost.accommodationCost}
                    isCheapest={r.homestay.id === cheapestId}
                    isMostExpensive={r.homestay.id === mostExpensiveId}
                  />
                )}
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  {distancesLoading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  avg {r.weightedAvgKm.toFixed(1)} km
                </span>
              </span>
            </Button>
            <div className="flex justify-end pr-2">
              <NightlyRateInput homestayId={r.homestay.id} homestayName={r.homestay.name} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
