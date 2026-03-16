import { haversineKm } from "./distance";
import type { Location, RankedHomestay } from "./types";
import type { DrivingDistance } from "@/store/distance-store";

export function rankHomestays(
  homestays: Location[],
  destinations: Location[],
  drivingDistances?: Map<string, DrivingDistance>
): RankedHomestay[] {
  if (homestays.length === 0 || destinations.length === 0) return [];

  const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);

  return homestays
    .map((homestay) => {
      const distances = destinations.map((dest) => {
        const key = `${homestay.id}:${dest.id}`;
        const driving = drivingDistances?.get(key);
        const haversine = haversineKm(homestay.lat, homestay.lon, dest.lat, dest.lon);

        return {
          destination: dest,
          km: haversine,
          drivingKm: driving?.drivingKm,
          drivingMinutes: driving?.drivingMinutes,
        };
      });

      const weightedAvgKm =
        distances.reduce((sum, d) => {
          const effectiveKm = d.drivingKm ?? d.km;
          return sum + effectiveKm * d.destination.priority;
        }, 0) / totalWeight;

      return { homestay, weightedAvgKm, distances };
    })
    .sort((a, b) => a.weightedAvgKm - b.weightedAvgKm);
}
