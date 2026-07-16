// The "address" field doubles as either a plain street address or a pasted
// Google Maps / location link — this tells the two apart.
export function isMapsLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Google's documented URL scheme for opening a search/business profile in
// Maps — no API key or Places lookup needed. Falls back to suburb name if
// no street address was captured, so it still lands close to the venue.
// If the poster pasted a Maps link directly into the address field, that
// exact link is used instead of a generated search query.
export function googleMapsUrl(venueName: string, address?: string | null, suburbName?: string) {
  if (address && isMapsLink(address)) return address;
  const query = [venueName, address || suburbName].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
