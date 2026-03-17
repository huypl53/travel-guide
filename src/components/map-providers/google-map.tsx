"use client";

import { useEffect, useMemo, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";

function FlyToLocation() {
  const map = useMap();
  const focused = useTripStore((s) => s.focusedLocation);
  const clearFocus = useTripStore((s) => s.setFocusedLocation);

  useEffect(() => {
    if (focused && map) {
      map.panTo({ lat: focused.lat, lng: focused.lon });
      map.setZoom(15);
      clearFocus(null);
    }
  }, [focused, map, clearFocus]);

  return null;
}

function distanceToColor(km: number, maxKm: number): string {
  const ratio = Math.min(km / maxKm, 1);
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},0)`;
}

function RoutePolylines({
  homestays,
  destinations,
  selectedHomestayIds,
  drivingDistances,
  routes,
  maxKm,
}: {
  homestays: { id: string; lat: number; lon: number }[];
  destinations: { id: string; lat: number; lon: number }[];
  selectedHomestayIds: Set<string>;
  drivingDistances: Map<string, { drivingKm: number }>;
  routes: Map<string, [number, number][]>;
  maxKm: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const polylines: google.maps.Polyline[] = [];

    for (const h of homestays) {
      const isSelected = selectedHomestayIds.has(h.id);
      for (const d of destinations) {
        const key = `${h.id}:${d.id}`;
        const driving = drivingDistances.get(key);
        const routeGeometry = routes.get(key);
        const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);

        const path = routeGeometry
          ? routeGeometry.map(([lat, lon]) => ({ lat, lng: lon }))
          : [
              { lat: h.lat, lng: h.lon },
              { lat: d.lat, lng: d.lon },
            ];

        const polyline = new google.maps.Polyline({
          path,
          strokeColor: distanceToColor(km, maxKm),
          strokeWeight: isSelected ? 3 : 2,
          strokeOpacity: isSelected ? 0.8 : 0.15,
          map,
        });
        polylines.push(polyline);
      }
    }

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, homestays, destinations, selectedHomestayIds, drivingDistances, routes, maxKm]);

  return null;
}

export default function GoogleMapInner() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
  const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  const center = useMemo(() => {
    if (locations.length > 0) {
      return {
        lat: locations.reduce((s, l) => s + l.lat, 0) / locations.length,
        lng: locations.reduce((s, l) => s + l.lon, 0) / locations.length,
      };
    }
    return { lat: 11.9404, lng: 108.4583 };
  }, [locations]);

  const drivingDistances = useDistanceStore((s) => s.distances);
  const routes = useDistanceStore((s) => s.routes);
  const fetchRoutes = useDistanceStore((s) => s.fetchRoutes);

  // Fetch route geometries for all homestays
  useEffect(() => {
    if (destinations.length > 0) {
      homestays.forEach((h) => fetchRoutes(h, destinations));
    }
  }, [homestays, destinations, fetchRoutes]);

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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  const handleMarkerClick = useCallback(
    (id: string) => () => setSelected(id),
    [setSelected]
  );

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        className="h-[300px] md:h-[500px] w-full rounded-lg"
        mapId="homestay-locator"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <FlyToLocation />

        {homestays.map((h) => (
          <AdvancedMarker
            key={h.id}
            position={{ lat: h.lat, lng: h.lon }}
            title={h.name}
            onClick={handleMarkerClick(h.id)}
          >
            <div style={{ opacity: selectedHomestayIds.has(h.id) ? 1 : 0.4 }}>
              <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#fff" />
            </div>
          </AdvancedMarker>
        ))}

        {destinations.map((d) => (
          <AdvancedMarker
            key={d.id}
            position={{ lat: d.lat, lng: d.lon }}
            title={`${d.name} (priority: ${d.priority})`}
          >
            <div style={{ opacity: selectedDestinationIds.has(d.id) ? 1 : 0.4 }}>
              <Pin background="#ef4444" borderColor="#991b1b" glyphColor="#fff" />
            </div>
          </AdvancedMarker>
        ))}

        {homestays.length > 0 && destinations.length > 0 && (
          <RoutePolylines
            homestays={homestays}
            destinations={destinations}
            selectedHomestayIds={selectedHomestayIds}
            drivingDistances={drivingDistances}
            routes={routes}
            maxKm={maxKm}
          />
        )}
      </Map>
    </APIProvider>
  );
}
