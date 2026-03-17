"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTripStore } from "@/store/trip-store";
import { useMapData } from "@/hooks/use-map-data";
import { haversineKm } from "@/lib/distance";
import { type MapStyle, leafletTileUrls, leafletAttributions } from "@/components/map-style-switcher";

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

export default function MapInner({ mapStyle = "default" }: { mapStyle?: MapStyle }) {
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

  return (
    <MapContainer center={[center.lat, center.lon]} zoom={13} zoomSnap={0.5} wheelDebounceTime={100} wheelPxPerZoomLevel={120} className="h-[250px] sm:h-[350px] md:h-[500px] w-full rounded-lg z-0">
      <FlyToLocation />
      <TileLayer
        key={mapStyle}
        attribution={leafletAttributions[mapStyle]}
        url={leafletTileUrls[mapStyle]}
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
        const hSelected = selectedHomestayIds.has(h.id);
        return destinations.map((d) => {
          const dSelected = selectedDestinationIds.has(d.id);
          const bothSelected = hSelected && dSelected;
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
                weight: bothSelected ? 3 : 2,
                opacity: bothSelected ? 0.8 : 0.15,
              }}
            />
          );
        });
      })}
    </MapContainer>
  );
}
