"use client";

import { useEffect, useCallback, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/store/trip-store";
import { useMapData } from "@/hooks/use-map-data";
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
  selectedDestinationIds,
  drivingDistances,
  routes,
  maxKm,
}: {
  homestays: { id: string; lat: number; lon: number }[];
  destinations: { id: string; lat: number; lon: number }[];
  selectedHomestayIds: Set<string>;
  selectedDestinationIds: Set<string>;
  drivingDistances: Map<string, { drivingKm: number }>;
  routes: Map<string, [number, number][]>;
  maxKm: number;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Remove old polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    for (const h of homestays) {
      const hSelected = selectedHomestayIds.has(h.id);
      for (const d of destinations) {
        const dSelected = selectedDestinationIds.has(d.id);
        const bothSelected = hSelected && dSelected;
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
          strokeWeight: bothSelected ? 3 : 2,
          strokeOpacity: bothSelected ? 0.8 : 0.15,
          map,
        });
        polylinesRef.current.push(polyline);
      }
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, homestays, destinations, selectedHomestayIds, selectedDestinationIds, drivingDistances, routes, maxKm]);

  return null;
}

export default function GoogleMapInner() {
  const {
    homestays,
    destinations,
    center,
    setSelected,
    selectedHomestayIds,
    selectedDestinationIds,
    drivingDistances,
    routes,
    maxKm,
  } = useMapData();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const handleMarkerClick = useCallback(
    (id: string) => () => setSelected(id),
    [setSelected]
  );

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={{ lat: center.lat, lng: center.lon }}
        defaultZoom={13}
        className="h-[250px] sm:h-[350px] md:h-[500px] w-full rounded-lg"
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
            selectedDestinationIds={selectedDestinationIds}
            drivingDistances={drivingDistances}
            routes={routes}
            maxKm={maxKm}
          />
        )}
      </Map>
    </APIProvider>
  );
}
