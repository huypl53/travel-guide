"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Table2, Car, Loader2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";
import { Button } from "@/components/ui/button";

export function DistanceMatrix() {
  const [expanded, setExpanded] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const setFocusedLocation = useTripStore((s) => s.setFocusedLocation);
  const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
  const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);
  const drivingDistances = useDistanceStore((s) => s.distances);
  const distancesLoading = useDistanceStore((s) => s.loading);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  if (homestays.length === 0 || destinations.length === 0) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between"
      >
        <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
          <Table2 className="h-4 w-4" />
          Distance Matrix
        </span>
        <span>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </Button>

      {expanded && (
        <div className="overflow-x-auto mt-2">
          <table className="text-xs sm:text-sm w-full">
            <thead>
              <tr>
                <th className="text-left p-1.5 sm:p-2"></th>
                {destinations.map((d) => (
                  <th key={d.id} className={`p-1.5 sm:p-2 text-center max-w-[60px] sm:max-w-[80px] truncate ${
                    !selectedDestinationIds.has(d.id) ? "opacity-40" : ""
                  }`}>
                    {d.name}
                  </th>
                ))}
                <th className="p-1.5 sm:p-2 text-center font-bold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {homestays.map((h, rowIndex) => {
                const dists = destinations.map((d) =>
                  haversineKm(h.lat, h.lon, d.lat, d.lon)
                );
                const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);
                const avg = destinations.reduce((sum, d, i) => {
                  const key = `${h.id}:${d.id}`;
                  const driving = drivingDistances.get(key);
                  return sum + (driving ? driving.drivingKm : dists[i]) * d.priority;
                }, 0) / totalWeight;

                return (
                  <tr
                    key={h.id}
                    className={`hover:bg-muted cursor-pointer border-b border-border/50 ${rowIndex % 2 !== 0 ? "bg-muted/30" : ""} ${!selectedHomestayIds.has(h.id) ? "opacity-40" : ""}`}
                    onClick={() => {
                      setSelected(h.id);
                      setFocusedLocation({ lat: h.lat, lon: h.lon });
                    }}
                  >
                    <td className="p-1.5 sm:p-2 font-medium">{h.name}</td>
                    {destinations.map((d, i) => {
                      const key = `${h.id}:${d.id}`;
                      const driving = drivingDistances.get(key);
                      const haversine = dists[i];

                      return (
                        <td key={d.id} className={`p-1.5 sm:p-2 text-center ${
                          !selectedDestinationIds.has(d.id) ? "opacity-40" : ""
                        }`}>
                          {driving ? (
                            <div>
                              <div className="flex items-center justify-center gap-1">
                                <Car className="h-3 w-3 text-muted-foreground" />
                                <span>{driving.drivingKm.toFixed(1)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {driving.drivingMinutes.toFixed(0)} min
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className={distancesLoading ? "text-muted-foreground" : ""}>
                                {haversine.toFixed(1)}
                              </span>
                              {distancesLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1.5 sm:p-2 text-center font-bold">{avg.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
