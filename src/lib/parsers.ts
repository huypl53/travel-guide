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
