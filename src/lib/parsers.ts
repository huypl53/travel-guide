interface ParsedLocation {
  lat: number;
  lon: number;
  name: string | null;
}

export function parseGoogleMapsUrl(url: string): ParsedLocation | null {
  const name = extractPlaceName(url);

  // Try @lat,lon pattern (most common in place URLs)
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), name };
  }

  // Try ?q=lat,lon pattern
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), name };
  }

  // Try !3d (lat) and !4d (lon) pattern in data params
  const lat3d = url.match(/!3d(-?\d+\.?\d*)/);
  const lon4d = url.match(/!4d(-?\d+\.?\d*)/);
  if (lat3d && lon4d) {
    return { lat: parseFloat(lat3d[1]), lon: parseFloat(lon4d[1]), name };
  }

  return null;
}

export function isShortMapsUrl(url: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(url);
}

function extractPlaceName(url: string): string | null {
  const placeMatch = url.match(/\/(?:place|search)\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }
  return null;
}

export interface ParsedFileLocation {
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

// --- Multi-location import ---

export interface DirectionsWaypoint {
  raw: string;
  coords: { lat: number; lon: number } | null;
}

export function isDirectionsUrl(url: string): boolean {
  return /google\.\w+\/maps\/dir\//.test(url);
}

export function parseDirectionsUrl(url: string): DirectionsWaypoint[] {
  const dirMatch = url.match(/\/maps\/dir\/([^?#]+)/);
  if (!dirMatch) return [];

  return dirMatch[1]
    .split("/")
    .filter((seg) => seg && !seg.startsWith("@"))
    .map((seg) => {
      const decoded = decodeURIComponent(seg.replace(/\+/g, " "));
      const coordMatch = decoded.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      return {
        raw: decoded,
        coords: coordMatch
          ? { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) }
          : null,
      };
    })
    .filter((wp) => wp.raw.trim().length > 0);
}

export function extractUrlsFromText(text: string): string[] {
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:google\.\w+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)\S+/gi;
  return [...text.matchAll(urlPattern)].map((m) =>
    m[0].replace(/[.,;!?)'"\]]+$/, "")
  );
}

export function isMultiLocationInput(text: string): boolean {
  const urls = extractUrlsFromText(text);
  if (urls.length > 1) return true;
  if (urls.length === 1 && isDirectionsUrl(urls[0])) return true;
  return false;
}
