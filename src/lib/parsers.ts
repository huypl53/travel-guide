interface ParsedLocation {
  lat: number;
  lon: number;
  name: string | null;
}

export function parseGoogleMapsUrl(url: string): ParsedLocation | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const name = extractPlaceName(url);
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), name };
  }

  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), name: null };
  }

  return null;
}

function extractPlaceName(url: string): string | null {
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }
  return null;
}

interface ParsedFileLocation {
  name: string;
  lat: number;
  lon: number;
  address: string | null;
}

export function parseCsvLocations(csv: string): ParsedFileLocation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const latIdx = headers.indexOf("lat");
  const lonIdx = headers.indexOf("lon");
  const addrIdx = headers.indexOf("address");

  if (nameIdx === -1 || latIdx === -1 || lonIdx === -1) return [];

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) return null;
      return {
        name: cols[nameIdx],
        lat,
        lon,
        address: addrIdx !== -1 ? cols[addrIdx] : null,
      };
    })
    .filter((loc): loc is ParsedFileLocation => loc !== null);
}

export function parseJsonLocations(json: string): ParsedFileLocation[] {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d.name && typeof d.lat === "number" && typeof d.lon === "number")
      .map((d) => ({
        name: d.name,
        lat: d.lat,
        lon: d.lon,
        address: d.address ?? null,
      }));
  } catch {
    return [];
  }
}
