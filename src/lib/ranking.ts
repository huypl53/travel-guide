import { haversineKm } from "./distance";
import type { Location, RankedHomestay } from "./types";

export function rankHomestays(
  homestays: Location[],
  destinations: Location[]
): RankedHomestay[] {
  if (homestays.length === 0 || destinations.length === 0) return [];

  const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);

  return homestays
    .map((homestay) => {
      const distances = destinations.map((dest) => ({
        destination: dest,
        km: haversineKm(homestay.lat, homestay.lon, dest.lat, dest.lon),
      }));

      const weightedAvgKm =
        distances.reduce(
          (sum, d) => sum + d.km * d.destination.priority,
          0
        ) / totalWeight;

      return { homestay, weightedAvgKm, distances };
    })
    .sort((a, b) => a.weightedAvgKm - b.weightedAvgKm);
}
