"use client";

import { useEffect, useRef } from "react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";

export function useAutoFetchDistances() {
  const locations = useTripStore((s) => s.locations);
  const fetchDistances = useDistanceStore((s) => s.fetchDistances);
  const clearDistances = useDistanceStore((s) => s.clearDistances);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const bases = locations.filter((l) => l.type === "base");
    const destinations = locations.filter((l) => l.type === "destination");

    if (bases.length === 0 || destinations.length === 0) {
      clearDistances();
      return;
    }

    timerRef.current = setTimeout(() => {
      fetchDistances(bases, destinations);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locations, fetchDistances, clearDistances]);
}
