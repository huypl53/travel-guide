"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("./map-inner"),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

export function MapView() {
  return <MapContainer />;
}
