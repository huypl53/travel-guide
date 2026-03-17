export type PoiCategory = "restaurant" | "store" | "atm" | "fuel" | "medical";

export interface PoiResult {
  category: PoiCategory;
  name: string;
  lat: number;
  lon: number;
  distance: number; // meters from center
}

const categoryTags: Record<PoiCategory, string[]> = {
  restaurant: ['amenity~"restaurant|cafe|fast_food"'],
  store: ['shop~"convenience|supermarket"'],
  atm: ['amenity~"atm|bank"'],
  fuel: ['amenity~"fuel"'],
  medical: ['amenity~"hospital|clinic|pharmacy"'],
};

export const allCategories: PoiCategory[] = ["restaurant", "store", "atm", "fuel", "medical"];

/**
 * Build an Overpass QL query for the given categories around a point.
 */
export function buildOverpassQuery(
  lat: number,
  lon: number,
  radius: number,
  categories: PoiCategory[],
): string {
  const unions = categories.flatMap((cat) =>
    categoryTags[cat].map(
      (tag) => `nwr(around:${radius},${lat},${lon})[${tag}];`,
    ),
  );

  return `[out:json][timeout:10];(${unions.join("")});out center;`;
}

/**
 * Determine which category a raw OSM element belongs to.
 */
export function classifyElement(tags: Record<string, string>): PoiCategory | null {
  const amenity = tags.amenity;
  const shop = tags.shop;

  if (amenity === "restaurant" || amenity === "cafe" || amenity === "fast_food") return "restaurant";
  if (shop === "convenience" || shop === "supermarket") return "store";
  if (amenity === "atm" || amenity === "bank") return "atm";
  if (amenity === "fuel") return "fuel";
  if (amenity === "hospital" || amenity === "clinic" || amenity === "pharmacy") return "medical";

  return null;
}

/**
 * Calculate distance in meters between two lat/lon points using Haversine.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
