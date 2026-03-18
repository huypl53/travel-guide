import { haversineKm } from "./distance";
import type { Location, RankedBase } from "./types";
import type { DrivingDistance } from "@/store/distance-store";

export function rankBases(
  bases: Location[],
  destinations: Location[],
  drivingDistances?: Map<string, DrivingDistance>
): RankedBase[] {
  if (bases.length === 0 || destinations.length === 0) return [];

  const totalWeight = destinations.reduce((sum, d) => sum + d.priority, 0);

  return bases
    .map((base) => {
      const distances = destinations.map((dest) => {
        const key = `${base.id}:${dest.id}`;
        const driving = drivingDistances?.get(key);
        const haversine = haversineKm(base.lat, base.lon, dest.lat, dest.lon);

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

      return { base, weightedAvgKm, distances };
    })
    .sort((a, b) => a.weightedAvgKm - b.weightedAvgKm);
}
