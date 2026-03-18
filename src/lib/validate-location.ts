const VALID_TYPES = new Set(["homestay", "destination"]);

/**
 * Validates a single location object from API input.
 * Returns null if valid, or a string describing the first validation error.
 */
export function validateLocation(item: unknown, index: number): string | null {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return `locations[${index}]: must be an object`;
  }

  const loc = item as Record<string, unknown>;

  // Required: id (string)
  if (typeof loc.id !== "string" || loc.id.length === 0) {
    return `locations[${index}]: id must be a non-empty string`;
  }

  // Required: name (string)
  if (typeof loc.name !== "string" || loc.name.length === 0) {
    return `locations[${index}]: name must be a non-empty string`;
  }

  // Required: lat (number, -90 to 90)
  if (typeof loc.lat !== "number" || !isFinite(loc.lat) || loc.lat < -90 || loc.lat > 90) {
    return `locations[${index}]: lat must be a number between -90 and 90`;
  }

  // Required: lon (number, -180 to 180)
  if (typeof loc.lon !== "number" || !isFinite(loc.lon) || loc.lon < -180 || loc.lon > 180) {
    return `locations[${index}]: lon must be a number between -180 and 180`;
  }

  // Required: type ("homestay" | "destination")
  if (!VALID_TYPES.has(loc.type as string)) {
    return `locations[${index}]: type must be "homestay" or "destination"`;
  }

  // Optional: priority (number 1-5)
  if (loc.priority !== undefined) {
    if (typeof loc.priority !== "number" || !Number.isInteger(loc.priority) || loc.priority < 1 || loc.priority > 5) {
      return `locations[${index}]: priority must be an integer between 1 and 5`;
    }
  }

  // Optional: notes (string)
  if (loc.notes !== undefined && loc.notes !== null && typeof loc.notes !== "string") {
    return `locations[${index}]: notes must be a string`;
  }

  // Optional: photoUrl (string)
  if (loc.photoUrl !== undefined && loc.photoUrl !== null && typeof loc.photoUrl !== "string") {
    return `locations[${index}]: photoUrl must be a string`;
  }

  // Optional: address (string | null)
  if (loc.address !== undefined && loc.address !== null && typeof loc.address !== "string") {
    return `locations[${index}]: address must be a string or null`;
  }

  // Optional: source (string)
  if (loc.source !== undefined && typeof loc.source !== "string") {
    return `locations[${index}]: source must be a string`;
  }

  return null;
}

/**
 * Validates an array of locations. Returns null if all valid,
 * or the first validation error string.
 */
export function validateLocations(locations: unknown[]): string | null {
  for (let i = 0; i < locations.length; i++) {
    const err = validateLocation(locations[i], i);
    if (err) return err;
  }
  return null;
}
