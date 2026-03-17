"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  type MapStyle,
  getPersistedMapStyle,
  persistMapStyle,
  MapStyleSwitcher,
} from "./map-style-switcher";

const LeafletMap = dynamic(
  () => import("./map-providers/leaflet-map"),
  { ssr: false, loading: () => <div className="h-[250px] sm:h-[350px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

const GoogleMap = dynamic(
  () => import("./map-providers/google-map"),
  { ssr: false, loading: () => <div className="h-[250px] sm:h-[350px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

function getMapProviderType(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (provider === "google" && apiKey) return "google";
  return "osm";
}

export function MapView() {
  const provider = getMapProviderType();
  const [mapStyle, setMapStyle] = useState<MapStyle>(getPersistedMapStyle);

  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    persistMapStyle(style);
  }, []);

  return (
    <div className="relative">
      <MapStyleSwitcher value={mapStyle} onChange={handleStyleChange} provider={provider} />
      {provider === "google" ? (
        <GoogleMap mapStyle={mapStyle} />
      ) : (
        <LeafletMap mapStyle={mapStyle} />
      )}
    </div>
  );
}
