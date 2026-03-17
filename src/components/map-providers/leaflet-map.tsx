"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import { haversineKm } from "@/lib/distance";

function FlyToLocation() {
  const map = useMap();
  const focused = useTripStore((s) => s.focusedLocation);
  const clearFocus = useTripStore((s) => s.setFocusedLocation);

  useEffect(() => {
    if (focused) {
      map.flyTo([focused.lat, focused.lon], 15, { duration: 1.2 });
      clearFocus(null);
    }
  }, [focused, map, clearFocus]);

  return null;
}

// Fix Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const homestayIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function distanceToColor(km: number, maxKm: number): string {
  const ratio = Math.min(km / maxKm, 1);
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},0)`;
}

export default function MapInner() {
  const locations = useTripStore((s) => s.locations);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);
  const selectedHomestayIds = useTripStore((s) => s.selectedHomestayIds);
  const selectedDestinationIds = useTripStore((s) => s.selectedDestinationIds);

  const homestays = useMemo(() => locations.filter((l) => l.type === "homestay"), [locations]);
  const destinations = useMemo(() => locations.filter((l) => l.type === "destination"), [locations]);

  // Default center: Da Lat, Vietnam
  const center: [number, number] =
    locations.length > 0
      ? [
          locations.reduce((s, l) => s + l.lat, 0) / locations.length,
          locations.reduce((s, l) => s + l.lon, 0) / locations.length,
        ]
      : [11.9404, 108.4583];

  const drivingDistances = useDistanceStore((s) => s.distances);
  const routes = useDistanceStore((s) => s.routes);
  const fetchRoutes = useDistanceStore((s) => s.fetchRoutes);

  // Fetch route geometries for all homestays
  useEffect(() => {
    if (destinations.length > 0) {
      homestays.forEach((h) => fetchRoutes(h, destinations));
    }
  }, [homestays, destinations, fetchRoutes]);

  // Calculate max distance for color scaling across all homestays
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

  return (
    <MapContainer center={center} zoom={13} zoomSnap={0.5} wheelDebounceTime={100} wheelPxPerZoomLevel={120} className="h-[300px] md:h-[500px] w-full rounded-lg z-0">
      <FlyToLocation />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {homestays.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lon]}
          icon={homestayIcon}
          opacity={selectedHomestayIds.has(h.id) ? 1 : 0.4}
          eventHandlers={{ click: () => setSelected(h.id) }}
        >
          <Popup>{h.name}</Popup>
        </Marker>
      ))}

      {destinations.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lon]}
          icon={destinationIcon}
          opacity={selectedDestinationIds.has(d.id) ? 1 : 0.4}
        >
          <Popup>
            {d.name} (priority: {d.priority})
          </Popup>
        </Marker>
      ))}

      {homestays.map((h) => {
        const isSelected = selectedHomestayIds.has(h.id);
        return destinations.map((d) => {
          const key = `${h.id}:${d.id}`;
          const driving = drivingDistances.get(key);
          const routeGeometry = routes.get(key);
          const km = driving?.drivingKm ?? haversineKm(h.lat, h.lon, d.lat, d.lon);
          const positions: [number, number][] = routeGeometry ?? [
            [h.lat, h.lon],
            [d.lat, d.lon],
          ];
          return (
            <Polyline
              key={`${h.id}-${d.id}`}
              positions={positions}
              pathOptions={{
                color: distanceToColor(km, maxKm),
                weight: isSelected ? 3 : 2,
                opacity: isSelected ? 0.8 : 0.15,
              }}
            />
          );
        });
      })}
    </MapContainer>
  );
}
