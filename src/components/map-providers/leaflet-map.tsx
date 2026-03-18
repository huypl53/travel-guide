"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTripStore } from "@/store/trip-store";
import { useMapData } from "@/hooks/use-map-data";
import { haversineKm } from "@/lib/distance";
import { type MapStyle, leafletTileUrls, leafletAttributions } from "@/components/map-style-switcher";
import { isSafeImageUrl } from "@/lib/utils";
import { poiCategoryColors, getCategoryLabel } from "@/components/nearby-poi";
import type { PoiResult } from "@/lib/overpass";

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

const baseIcon = new L.Icon({
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


export default function MapInner({ mapStyle = "default", pois = [] }: { mapStyle?: MapStyle; pois?: PoiResult[] }) {
  const {
    bases,
    destinations,
    center,
    setSelected,
    selectedBaseIds,
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

      {bases.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lon]}
          icon={baseIcon}
          opacity={selectedBaseIds.has(h.id) ? 1 : 0.4}
          eventHandlers={{ click: () => setSelected(h.id) }}
        >
          <Popup>
            <div>
              <strong>{h.name}</strong>
              {h.photoUrl && isSafeImageUrl(h.photoUrl) && (
                <img src={h.photoUrl} alt="" className="mt-1 w-24 h-16 object-cover rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              {h.notes && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{h.notes}</p>
              )}
            </div>
          </Popup>
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
            <div>
              <strong>{d.name}</strong> (priority: {d.priority})
              {d.photoUrl && isSafeImageUrl(d.photoUrl) && (
                <img src={d.photoUrl} alt="" className="mt-1 w-24 h-16 object-cover rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              {d.notes && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{d.notes}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* POI markers */}
      {pois.map((poi, i) => (
        <CircleMarker
          key={`poi-${i}-${poi.lat}-${poi.lon}`}
          center={[poi.lat, poi.lon]}
          radius={6}
          pathOptions={{
            color: poiCategoryColors[poi.category],
            fillColor: poiCategoryColors[poi.category],
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong>{poi.name}</strong>
              <p className="text-gray-500">{getCategoryLabel(poi.category)} &middot; {poi.distance}m away</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {bases.map((h) => {
        const hSelected = selectedBaseIds.has(h.id);
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
