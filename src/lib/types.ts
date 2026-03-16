export type LocationType = "homestay" | "destination";
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
}

export interface DistanceEntry {
  homestayId: string;
  destinationId: string;
  straightLineKm: number;
  drivingKm: number | null;
  drivingMinutes: number | null;
}

export interface RankedHomestay {
  homestay: Location;
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
  homestayCount: number;
  destinationCount: number;
  topHomestay: string | null;
  isSaved: boolean;
}
