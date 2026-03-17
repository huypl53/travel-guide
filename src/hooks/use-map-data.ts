"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";

export function useMapData() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
  const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const drivingDistances = useDistanceStore((s) => s.distances);
  const routes = useDistanceStore((s) => s.routes);
  const fetchRoutes = useDistanceStore((s) => s.fetchRoutes);

  // Lazy route fetching: fetch for selected homestays first, then background-fetch the rest
  const fetchedRef = useRef(new Set<string>());
  useEffect(() => {
    if (destinations.length === 0) return;

    // Fetch selected homestays first (priority)
    const selected = homestays.filter((h) => selectedHomestayIds.has(h.id));
    const unselected = homestays.filter((h) => !selectedHomestayIds.has(h.id));

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
  }, [homestays, destinations, selectedHomestayIds, fetchRoutes]);

  // Reset fetched tracking when destinations change
  const prevDestsRef = useRef(destinations);
  useEffect(() => {
    if (prevDestsRef.current !== destinations) {
      fetchedRef.current.clear();
      prevDestsRef.current = destinations;
    }
  }, [destinations]);

  const maxKm = useMemo(() => {
    if (homestays.length === 0 || destinations.length === 0) return 10;
    let max = 0;
    for (const h of homestays) {
      for (const d of destinations) {
        const key = `${h.id}:${d.id}`;
        const driving = drivingDistances.get(key);
        const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);
        if (km > max) max = km;
      }
    }
    return max || 10;
  }, [homestays, destinations, drivingDistances]);

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
    homestays,
    destinations,
    center,
    setSelected,
    selectedHomestayIds,
    selectedDestinationIds,
    drivingDistances,
    routes,
    maxKm,
  };
}
