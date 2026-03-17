"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UtensilsCrossed,
  ShoppingBag,
  Banknote,
  Fuel,
  Heart,
  Loader2,
  MapPinned,
} from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { cn } from "@/lib/utils";
import type { PoiCategory, PoiResult } from "@/lib/overpass";

export type { PoiResult };

interface CategoryConfig {
  id: PoiCategory;
  label: string;
  icon: typeof UtensilsCrossed;
  color: string;
  bgColor: string;
}

export const poiCategories: CategoryConfig[] = [
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, color: "text-orange-500", bgColor: "bg-orange-500" },
  { id: "store", label: "Store", icon: ShoppingBag, color: "text-blue-500", bgColor: "bg-blue-500" },
  { id: "atm", label: "ATM/Bank", icon: Banknote, color: "text-green-500", bgColor: "bg-green-500" },
  { id: "fuel", label: "Gas Station", icon: Fuel, color: "text-red-500", bgColor: "bg-red-500" },
  { id: "medical", label: "Medical", icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500" },
];

export const poiCategoryColors: Record<PoiCategory, string> = {
  restaurant: "#f97316",
  store: "#3b82f6",
  atm: "#22c55e",
  fuel: "#ef4444",
  medical: "#ec4899",
};

interface NearbyPoiProps {
  onPoisChange: (pois: PoiResult[]) => void;
}

export function NearbyPoi({ onPoisChange }: NearbyPoiProps) {
  const selectedHomestayId = useTripStore((s) => s.selectedHomestayId);
  const locations = useTripStore((s) => s.locations);

  const [enabledCategories, setEnabledCategories] = useState<Set<PoiCategory>>(new Set());
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<PoiResult[]>([]);
  const radiusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedHomestay = locations.find(
    (l) => l.id === selectedHomestayId && l.type === "homestay",
  );

  // Clear POIs when selected homestay changes
  useEffect(() => {
    setPois([]);
    onPoisChange([]);
    setEnabledCategories(new Set());
    setError(null);
  }, [selectedHomestayId, onPoisChange]);

  const fetchPois = useCallback(
    async (cats: PoiCategory[], rad: number) => {
      if (!selectedHomestay || cats.length === 0) {
        setPois([]);
        onPoisChange([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: selectedHomestay.lat.toString(),
          lon: selectedHomestay.lon.toString(),
          radius: rad.toString(),
          categories: cats.join(","),
        });

        const res = await fetch(`/api/nearby?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setPois(data.pois);
        onPoisChange(data.pois);
      } catch {
        setError("Could not load nearby places");
        setPois([]);
        onPoisChange([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedHomestay, onPoisChange],
  );

  const toggleCategory = useCallback(
    (cat: PoiCategory) => {
      setEnabledCategories((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        fetchPois(Array.from(next), radius);
        return next;
      });
    },
    [fetchPois, radius],
  );

  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setRadius(val);
      if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current);
      if (enabledCategories.size > 0) {
        radiusTimerRef.current = setTimeout(() => {
          fetchPois(Array.from(enabledCategories), val);
        }, 300);
      }
    },
    [fetchPois, enabledCategories],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current);
    };
  }, []);

  if (!selectedHomestay) return null;

  const poiCountByCategory = pois.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-56 rounded-lg bg-background/90 p-3 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <MapPinned className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium truncate">Nearby: {selectedHomestay.name}</span>
        {loading && <Loader2 className="size-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      <div className="space-y-1">
        {poiCategories.map(({ id, label, icon: Icon, color }) => {
          const active = enabledCategories.has(id);
          const count = poiCountByCategory[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleCategory(id)}
              className={cn(
                "flex items-center gap-2 w-full rounded-md px-2 py-1 text-xs transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-3.5", active ? color : "")} />
              <span className="flex-1 text-left">{label}</span>
              {active && count !== undefined && (
                <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
          <span>Radius</span>
          <span>{radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}</span>
        </div>
        <input
          type="range"
          min={500}
          max={2000}
          step={100}
          value={radius}
          onChange={handleRadiusChange}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
      </div>

      {error && (
        <p className="text-[10px] text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
