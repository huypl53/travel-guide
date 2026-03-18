export type LocationType = "base" | "destination";
export type LocationSource = "manual" | "google_maps" | "csv";

export interface Location {
  id: string;
  tripId: string;
  type: LocationType;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  priority: number; // 1-5, meaningful for destinations
  source: LocationSource;
  notes: string | null;
  photoUrl: string | null;
}

export interface DistanceEntry {
  baseId: string;
  destinationId: string;
  straightLineKm: number;
  drivingKm: number | null;
  drivingMinutes: number | null;
}

export interface RankedBase {
  base: Location;
  weightedAvgKm: number;
  distances: {
    destination: Location;
    km: number;
    drivingKm?: number;
    drivingMinutes?: number;
  }[];
}

export interface Trip {
  id: string;
  name: string;
  shareSlug: string;
  userId: string | null;
  createdAt: string;
  locations: Location[];
}

export interface SavedTrip {
  id: string;
  userId: string;
  tripId: string;
  savedAt: string;
}

export interface TripCardData {
  id: string;
  name: string;
  shareSlug: string;
  createdAt: string;
  baseCount: number;
  destinationCount: number;
  topBase: string | null;
  isSaved: boolean;
}

export interface CollabSession {
  id: string;
  slug: string;
  tripName: string;
  tripData: Location[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface CollabParticipant {
  id: string;
  nickname: string;
  color: string;
}

export type CollabDelta =
  | { action: "set-trip-name"; name: string }
  | { action: "add-location"; location: Location }
  | { action: "remove-location"; locationId: string }
  | { action: "update-priority"; locationId: string; priority: number }
  | { action: "update-notes"; locationId: string; notes: string }
  | { action: "update-photo"; locationId: string; photoUrl: string }
  | { action: "full-sync"; tripName: string; locations: Location[] };
