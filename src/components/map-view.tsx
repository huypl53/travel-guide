"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(
  () => import("./map-providers/leaflet-map"),
  { ssr: false, loading: () => <div className="h-[300px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

const GoogleMap = dynamic(
  () => import("./map-providers/google-map"),
  { ssr: false, loading: () => <div className="h-[300px] md:h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

function useMapProvider(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (provider === "google" && apiKey) return "google";
  return "osm";
}

export function MapView() {
  const provider = useMapProvider();
  return provider === "google" ? <GoogleMap /> : <LeafletMap />;
}
