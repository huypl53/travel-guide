interface Coord {
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
