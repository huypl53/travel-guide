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
  const selectedId = useTripStore((s) => s.selectedHomestayId);
  const setSelected = useTripStore((s) => s.setSelectedHomestay);

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

  const selectedHomestay = homestays.find((h) => h.id === selectedId);

  // Fetch route geometries when selected homestay changes
  useEffect(() => {
    if (selectedHomestay && destinations.length > 0) {
      fetchRoutes(selectedHomestay, destinations);
    }
  }, [selectedHomestay, destinations, fetchRoutes]);

  // Calculate max distance for color scaling
  const maxKm =
    selectedHomestay && destinations.length > 0
      ? Math.max(
          ...destinations.map((d) => {
            const key = `${selectedHomestay.id}:${d.id}`;
            const driving = drivingDistances.get(key);
            return driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
          })
        )
      : 10;

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
          eventHandlers={{ click: () => setSelected(h.id) }}
        >
          <Popup>{h.name}</Popup>
        </Marker>
      ))}

      {destinations.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lon]} icon={destinationIcon}>
          <Popup>
            {d.name} (priority: {d.priority})
          </Popup>
        </Marker>
      ))}

      {selectedHomestay &&
        destinations.map((d) => {
          const key = `${selectedHomestay.id}:${d.id}`;
          const driving = drivingDistances.get(key);
          const routeGeometry = routes.get(key);
          const km = driving?.drivingKm ?? haversineKm(selectedHomestay.lat, selectedHomestay.lon, d.lat, d.lon);
          const positions: [number, number][] = routeGeometry ?? [
            [selectedHomestay.lat, selectedHomestay.lon],
            [d.lat, d.lon],
          ];
          return (
            <Polyline
              key={`${selectedHomestay.id}-${d.id}`}
              positions={positions}
              pathOptions={{
                color: distanceToColor(km, maxKm),
                weight: 3,
                opacity: 0.8,
              }}
            />
          );
        })}
    </MapContainer>
  );
}
