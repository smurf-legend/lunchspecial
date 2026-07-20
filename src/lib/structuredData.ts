// JSON.stringify alone isn't safe to drop into a <script> tag — if a user's
// title/description ever contains the literal string "</script>", it closes
// the tag early and whatever follows in the raw HTML gets parsed as markup
// instead of JSON. Escaping "<" to its unicode form keeps the JSON valid
// while making that impossible.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type OfferJsonLdInput = {
  url: string;
  title: string;
  description: string;
  venueName: string;
  imageUrl?: string | null;
  specialPrice?: number | null;
  discountPercent?: number | null;
  expiresAt?: Date | string | null;
  expired: boolean;
  locationName?: string;
};

export function buildOfferJsonLd(special: OfferJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: special.title,
    description: special.description,
    url: special.url,
    availability: special.expired ? "https://schema.org/Discontinued" : "https://schema.org/InStock",
    seller: {
      "@type": "Restaurant",
      name: special.venueName,
      ...(special.locationName && { address: special.locationName }),
    },
  };

  if (special.imageUrl) jsonLd.image = special.imageUrl;
  if (special.expiresAt) jsonLd.priceValidUntil = new Date(special.expiresAt).toISOString().slice(0, 10);
  // Only advertise a price when there's a real fixed one — a percentage-off
  // deal has no single price to report, and schema.org's Offer expects a
  // price/priceCurrency pair rather than a percentage.
  if (special.specialPrice != null) {
    jsonLd.price = special.specialPrice;
    jsonLd.priceCurrency = "AUD";
  }

  return jsonLd;
}
