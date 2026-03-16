"use client";

import { useState } from "react";
import { Car, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <Car className="h-3 w-3" />
        {result.km.toFixed(1)}km / {result.min.toFixed(0)}min
      </span>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          onClick={loading ? undefined : fetchDriving}
          className={`inline-flex items-center justify-center h-5 px-1 rounded text-xs cursor-pointer hover:bg-muted transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Car className="h-3 w-3" />}
        </TooltipTrigger>
        <TooltipContent>
          <p>Get driving time</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
