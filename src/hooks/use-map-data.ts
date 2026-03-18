"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";

export function useMapData() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedBase);
  const selectedBaseIds = useTripStore((s) => s.selectedBaseIds);
  const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);

  const bases = useMemo(() => locations.filter((l) => l.type === "base"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const drivingDistances = useDistanceStore((s) => s.distances);
  const routes = useDistanceStore((s) => s.routes);
  const fetchRoutes = useDistanceStore((s) => s.fetchRoutes);

  // Lazy route fetching: fetch for selected bases first, then background-fetch the rest
  const fetchedRef = useRef(new Set<string>());
  useEffect(() => {
    if (destinations.length === 0) return;

    // Fetch selected bases first (priority)
    const selected = bases.filter((h) => selectedBaseIds.has(h.id));
    const unselected = bases.filter((h) => !selectedBaseIds.has(h.id));

    for (const h of selected) {
      if (!fetchedRef.current.has(h.id)) {
        fetchedRef.current.add(h.id);
        fetchRoutes(h, destinations);
      }
    }

    // Background-fetch unselected after a delay
    const timer = setTimeout(() => {
      for (const h of unselected) {
        if (!fetchedRef.current.has(h.id)) {
          fetchedRef.current.add(h.id);
          fetchRoutes(h, destinations);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [bases, destinations, selectedBaseIds, fetchRoutes]);

  // Reset fetched tracking when destinations change
  const prevDestsRef = useRef(destinations);
  useEffect(() => {
    if (prevDestsRef.current !== destinations) {
      fetchedRef.current.clear();
      prevDestsRef.current = destinations;
    }
  }, [destinations]);

  const maxKm = useMemo(() => {
    if (bases.length === 0 || destinations.length === 0) return 10;
    let max = 0;
    for (const h of bases) {
      for (const d of destinations) {
        const key = `${h.id}:${d.id}`;
        const driving = drivingDistances.get(key);
        const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);
        if (km > max) max = km;
      }
    }
    return max || 10;
  }, [bases, destinations, drivingDistances]);

  const center = useMemo(() => {
    if (locations.length > 0) {
      return {
        lat: locations.reduce((s, l) => s + l.lat, 0) / locations.length,
        lon: locations.reduce((s, l) => s + l.lon, 0) / locations.length,
      };
    }
    return { lat: 11.9404, lon: 108.4583 };
  }, [locations]);

  return {
    locations,
    bases,
    destinations,
    center,
    setSelected,
    selectedBaseIds,
    selectedDestinationIds,
    drivingDistances,
    routes,
    maxKm,
  };
}
