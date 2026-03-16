"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DrivingTimeButtonProps {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
}

export function DrivingTimeButton({ fromLat, fromLon, toLat, toLon }: DrivingTimeButtonProps) {
  const [result, setResult] = useState<{ km: number; min: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDriving() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/directions?from=${fromLat},${fromLon}&to=${toLat},${toLon}`
      );
      const data = await res.json();
      if (data.distanceKm) {
        setResult({ km: data.distanceKm, min: data.durationMinutes });
      }
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <span className="text-xs text-muted-foreground">
        {result.km.toFixed(1)}km / {result.min.toFixed(0)}min
      </span>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={fetchDriving} disabled={loading}>
      {loading ? "..." : "drive?"}
    </Button>
  );
}
