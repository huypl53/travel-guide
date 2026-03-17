"use client";

import { Map, Satellite, Mountain, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MapStyle = "default" | "satellite" | "terrain" | "dark";

const styles: { id: MapStyle; label: string; icon: typeof Map }[] = [
  { id: "default", label: "Default", icon: Map },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "terrain", label: "Terrain", icon: Mountain },
  { id: "dark", label: "Dark", icon: Moon },
];

const STORAGE_KEY = "map-style";

export function getPersistedMapStyle(): MapStyle {
  if (typeof window === "undefined") return "default";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && styles.some((s) => s.id === stored)) return stored as MapStyle;
  } catch {}
  return "default";
}

export function persistMapStyle(style: MapStyle) {
  try { localStorage.setItem(STORAGE_KEY, style); } catch {}
}

/** Leaflet tile attributions for each map style */
export const leafletAttributions: Record<MapStyle, string> = {
  default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics',
  terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  dark: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** Leaflet tile URLs for each map style */
export const leafletTileUrls: Record<MapStyle, string> = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

/** Google Maps mapTypeId for each style */
export const googleMapTypeIds: Record<MapStyle, string> = {
  default: "roadmap",
  satellite: "satellite",
  terrain: "terrain",
  dark: "roadmap",
};

export function MapStyleSwitcher({
  value,
  onChange,
}: {
  value: MapStyle;
  onChange: (style: MapStyle) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex gap-0.5 rounded-lg bg-background/80 p-0.5 shadow-md backdrop-blur-sm">
      {styles.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={`${label} map style`}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5 sm:p-1 text-muted-foreground motion-safe:transition-colors",
            "hover:text-foreground hover:bg-muted/60",
            value === id && "bg-muted text-foreground"
          )}
        >
          <Icon className="size-4 sm:size-3.5" />
        </button>
      ))}
    </div>
  );
}
