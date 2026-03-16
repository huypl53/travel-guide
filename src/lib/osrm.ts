export interface Coord {
  lat: number;
  lon: number;
}

export interface TableEntry {
  distanceKm: number;
  durationMinutes: number;
}

export function buildOsrmTableUrl(sources: Coord[], destinations: Coord[]): string {
  const allCoords = [...sources, ...destinations]
    .map((c) => `${c.lon},${c.lat}`)
    .join(";");

  const sourceIndices = sources.map((_, i) => i).join(";");
  const destIndices = destinations.map((_, i) => i + sources.length).join(";");

  return `https://router.project-osrm.org/table/v1/driving/${allCoords}?sources=${sourceIndices}&destinations=${destIndices}&annotations=distance,duration`;
}

export function parseTableResponse(
  response: { distances: (number | null)[][]; durations: (number | null)[][] },
  sourceCount: number,
  destCount: number
): (TableEntry | null)[][] {
  const result: (TableEntry | null)[][] = [];

  for (let s = 0; s < sourceCount; s++) {
    const row: (TableEntry | null)[] = [];
    for (let d = 0; d < destCount; d++) {
      const dist = response.distances[s][d];
      const dur = response.durations[s][d];
      if (dist === null || dur === null) {
        row.push(null);
      } else {
        row.push({
          distanceKm: dist / 1000,
          durationMinutes: dur / 60,
        });
      }
    }
    result.push(row);
  }

  return result;
}

/** Decode an OSRM/Google encoded polyline (precision 5) into [lat, lon] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lon += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}

export function buildOsrmRouteUrl(from: Coord, to: Coord): string {
  return `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=polyline`;
}
