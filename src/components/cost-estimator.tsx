"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Bike, Car, Moon } from "lucide-react";
import { useCostStore } from "@/store/cost-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CostEstimator() {
  const params = useParams();
  const slug = params.slug as string;

  const tripNights = useCostStore((s) => s.tripNights);
  const transportMode = useCostStore((s) => s.transportMode);
  const fuelCostPerKm = useCostStore((s) => s.fuelCostPerKm);
  const setTripNights = useCostStore((s) => s.setTripNights);
  const setTransportMode = useCostStore((s) => s.setTransportMode);
  const loadFromStorage = useCostStore((s) => s.loadFromStorage);
  const saveToStorage = useCostStore((s) => s.saveToStorage);

  const nightlyRates = useCostStore((s) => s.nightlyRates);
  const slugRef = useRef<string>("");
  const hasLoaded = useRef(false);

  // Load from localStorage on mount or slug change
  useEffect(() => {
    loadFromStorage(slug);
    slugRef.current = slug;
    hasLoaded.current = true;
  }, [slug, loadFromStorage]);

  // Auto-save on any cost-related change
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (slugRef.current !== slug) return;
    saveToStorage(slug);
  }, [slug, tripNights, transportMode, fuelCostPerKm, nightlyRates, saveToStorage]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Trip nights */}
      <div className="flex items-center gap-1.5">
        <Moon className="h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          min={1}
          value={tripNights}
          onChange={(e) => setTripNights(Number(e.target.value) || 1)}
          className="w-16 h-8 sm:h-7 text-center text-sm"
          aria-label="Trip nights"
        />
        <span className="text-sm text-muted-foreground">nights</span>
      </div>

      {/* Transport mode toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
        <Button
          variant={transportMode === "motorbike" ? "secondary" : "ghost"}
          size="icon-xs"
          className="h-11 w-11 sm:h-8 sm:w-8"
          onClick={() => setTransportMode("motorbike")}
          title="Motorbike (3,000 VND/km)"
          aria-label="Motorbike"
          aria-pressed={transportMode === "motorbike"}
        >
          <Bike className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={transportMode === "car" ? "secondary" : "ghost"}
          size="icon-xs"
          className="h-11 w-11 sm:h-8 sm:w-8"
          onClick={() => setTransportMode("car")}
          title="Car (6,000 VND/km)"
          aria-label="Car"
          aria-pressed={transportMode === "car"}
        >
          <Car className="h-3.5 w-3.5" />
        </Button>
      </div>

      <span className="text-xs text-muted-foreground">
        {formatVND(fuelCostPerKm)}/km
      </span>
    </div>
  );
}

/** Format number as VND with dot separators */
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

/** Calculate total cost for a homestay given its distances to destinations */
export function calculateCost(
  totalDrivingKm: number,
  nightlyRate: number,
  tripNights: number,
  fuelCostPerKm: number
): { transportCost: number; accommodationCost: number; totalCost: number } {
  const transportCost = totalDrivingKm * 2 * fuelCostPerKm;
  const accommodationCost = nightlyRate * tripNights;
  const totalCost = transportCost + accommodationCost;
  return { transportCost, accommodationCost, totalCost };
}
