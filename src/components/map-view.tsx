"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  type MapStyle,
  getPersistedMapStyle,
  persistMapStyle,
  MapStyleSwitcher,
} from "./map-style-switcher";
import { NearbyPoi, type PoiResult } from "./nearby-poi";

const LeafletMap = dynamic(
  () => import("./map-providers/leaflet-map"),
  { ssr: false, loading: () => <div className="h-full min-h-[300px] bg-muted animate-pulse rounded-lg" /> }
);

const GoogleMap = dynamic(
  () => import("./map-providers/google-map"),
  { ssr: false, loading: () => <div className="h-full min-h-[300px] bg-muted animate-pulse rounded-lg" /> }
);

function getMapProviderType(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (provider === "google" && apiKey) return "google";
  return "osm";
}

export function MapView({ className }: { className?: string }) {
  const provider = getMapProviderType();
  const [mapStyle, setMapStyle] = useState<MapStyle>(getPersistedMapStyle);
  const [pois, setPois] = useState<PoiResult[]>([]);

  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    persistMapStyle(style);
  }, []);

  const handlePoisChange = useCallback((newPois: PoiResult[]) => {
    setPois(newPois);
  }, []);

  return (
    <div className={`relative h-full${className ? ` ${className}` : ""}`}>
      <MapStyleSwitcher value={mapStyle} onChange={handleStyleChange} provider={provider} />
      {provider === "google" ? (
        <GoogleMap mapStyle={mapStyle} pois={pois} />
      ) : (
        <LeafletMap mapStyle={mapStyle} pois={pois} />
      )}
      <NearbyPoi onPoisChange={handlePoisChange} />
    </div>
  );
}
