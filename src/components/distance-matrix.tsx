"use client";

import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import { haversineKm } from "@/lib/distance";
import { Button } from "@/components/ui/button";
import { DrivingTimeButton } from "@/components/driving-time-button";

export function DistanceMatrix() {
  const [expanded, setExpanded] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);

  const homestays = locations.filter((l) => l.type === "homestay");
  const destinations = locations.filter((l) => l.type === "destination");

  if (homestays.length === 0 || destinations.length === 0) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between"
      >
        <span className="font-semibold text-sm">Distance Matrix</span>
        <span>{expanded ? "\u25B2" : "\u25BC"}</span>
      </Button>

      {expanded && (
        <div className="overflow-x-auto mt-2">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left p-1"></th>
                {destinations.map((d) => (
                  <th key={d.id} className="p-1 text-center max-w-[80px] truncate">
                    {d.name}
                  </th>
                ))}
                <th className="p-1 text-center font-bold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {homestays.map((h) => {
                const dists = destinations.map((d) =>
                  haversineKm(h.lat, h.lon, d.lat, d.lon)
                );
                const avg = dists.reduce((s, d) => s + d, 0) / dists.length;
                return (
                  <tr
                    key={h.id}
                    className="hover:bg-muted cursor-pointer"
                    onClick={() => setSelected(h.id)}
                  >
                    <td className="p-1 font-medium">{h.name}</td>
                    {dists.map((km, i) => (
                      <td key={destinations[i].id} className="p-1 text-center">
                        <div>{km.toFixed(1)}</div>
                        <DrivingTimeButton fromLat={h.lat} fromLon={h.lon} toLat={destinations[i].lat} toLon={destinations[i].lon} />
                      </td>
                    ))}
                    <td className="p-1 text-center font-bold">{avg.toFixed(1)}</td>
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
