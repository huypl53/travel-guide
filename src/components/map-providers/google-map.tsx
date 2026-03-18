"use client";

import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/store/trip-store";
import { useMapData } from "@/hooks/use-map-data";
import { haversineKm } from "@/lib/distance";
import { type MapStyle, googleMapTypeIds } from "@/components/map-style-switcher";
import { isSafeImageUrl } from "@/lib/utils";
import { poiCategoryColors, getCategoryLabel } from "@/components/nearby-poi";
import type { Location } from "@/lib/types";
import type { PoiResult } from "@/lib/overpass";

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
  bases,
  destinations,
  selectedBaseIds,
  selectedDestinationIds,
  drivingDistances,
  routes,
  maxKm,
}: {
  bases: { id: string; lat: number; lon: number }[];
  destinations: { id: string; lat: number; lon: number }[];
  selectedBaseIds: Set<string>;
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

    for (const h of bases) {
      const hSelected = selectedBaseIds.has(h.id);
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
  }, [map, bases, destinations, selectedBaseIds, selectedDestinationIds, drivingDistances, routes, maxKm]);

  return null;
}

function MarkerInfoWindow({ location, label }: { location: Location; label?: string }) {
  return (
    <div className="max-w-[200px]">
      <strong className="text-sm">{location.name}{label ? ` ${label}` : ""}</strong>
      {location.photoUrl && isSafeImageUrl(location.photoUrl) && (
        <img
          src={location.photoUrl}
          alt=""
          className="mt-1 w-24 h-16 object-cover rounded"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {location.notes && (
        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{location.notes}</p>
      )}
    </div>
  );
}


function PoiMarker({ poi }: { poi: PoiResult }) {
  const [open, setOpen] = useState(false);
  const color = poiCategoryColors[poi.category];

  return (
    <>
      <AdvancedMarker
        position={{ lat: poi.lat, lng: poi.lon }}
        onClick={() => setOpen(true)}
      >
        <div
          className="rounded-full border-2"
          style={{
            width: 14,
            height: 14,
            backgroundColor: color,
            borderColor: "white",
          }}
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow
          position={{ lat: poi.lat, lng: poi.lon }}
          onCloseClick={() => setOpen(false)}
        >
          <div className="text-xs max-w-[160px]">
            <strong>{poi.name}</strong>
            <p className="text-gray-500">{getCategoryLabel(poi.category)} &middot; {poi.distance}m away</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function GoogleMapInner({ mapStyle = "default", pois = [] }: { mapStyle?: MapStyle; pois?: PoiResult[] }) {
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

  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const handleMarkerClick = useCallback(
    (id: string) => () => {
      setSelected(id);
      setOpenInfoId(id);
    },
    [setSelected]
  );

  const handleInfoClose = useCallback(() => setOpenInfoId(null), []);

  const allLocations = useMemo(() => {
    const map: Record<string, Location> = {};
    for (const h of bases) map[h.id] = h;
    for (const d of destinations) map[d.id] = d;
    return map;
  }, [bases, destinations]);

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={{ lat: center.lat, lng: center.lon }}
        defaultZoom={13}
        className="h-full min-h-[300px] w-full rounded-lg"
        mapId="base-locator"
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeId={mapStyle !== "dark" ? googleMapTypeIds[mapStyle] : googleMapTypeIds.default}
      >
        <FlyToLocation />

        {bases.map((h) => (
          <AdvancedMarker
            key={h.id}
            position={{ lat: h.lat, lng: h.lon }}
            onClick={handleMarkerClick(h.id)}
          >
            <div style={{ opacity: selectedBaseIds.has(h.id) ? 1 : 0.4 }}>
              <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#fff" />
            </div>
          </AdvancedMarker>
        ))}

        {destinations.map((d) => (
          <AdvancedMarker
            key={d.id}
            position={{ lat: d.lat, lng: d.lon }}
            onClick={handleMarkerClick(d.id)}
          >
            <div style={{ opacity: selectedDestinationIds.has(d.id) ? 1 : 0.4 }}>
              <Pin background="#ef4444" borderColor="#991b1b" glyphColor="#fff" />
            </div>
          </AdvancedMarker>
        ))}

        {/* POI markers */}
        {pois.map((poi, i) => (
          <PoiMarker key={`poi-${i}-${poi.lat}-${poi.lon}`} poi={poi} />
        ))}

        {openInfoId && allLocations[openInfoId] && (
          <InfoWindow
            position={{
              lat: allLocations[openInfoId].lat,
              lng: allLocations[openInfoId].lon,
            }}
            onCloseClick={handleInfoClose}
          >
            <MarkerInfoWindow
              location={allLocations[openInfoId]}
              label={allLocations[openInfoId].type === "destination" ? `(priority: ${allLocations[openInfoId].priority})` : undefined}
            />
          </InfoWindow>
        )}

        {bases.length > 0 && destinations.length > 0 && (
          <RoutePolylines
            bases={bases}
            destinations={destinations}
            selectedBaseIds={selectedBaseIds}
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
