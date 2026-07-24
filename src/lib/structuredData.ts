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
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  expiresAt?: Date | string | null;
  expired: boolean;
  locationName?: string;
};

export function buildOfferJsonLd(special: OfferJsonLdInput) {
  // A price range (a whole specials menu, not one item) has no single price
  // to report — schema.org's dedicated type for that is AggregateOffer with
  // lowPrice/highPrice, rather than Offer's single price/priceCurrency pair.
  const isRange = special.specialPrice == null && special.priceRangeMin != null && special.priceRangeMax != null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isRange ? "AggregateOffer" : "Offer",
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
  // Only advertise a price when there's a real fixed one or a range — a
  // percentage-off deal has no single price to report.
  if (special.specialPrice != null) {
    jsonLd.price = special.specialPrice;
    jsonLd.priceCurrency = "AUD";
  } else if (isRange) {
    jsonLd.lowPrice = special.priceRangeMin;
    jsonLd.highPrice = special.priceRangeMax;
    jsonLd.priceCurrency = "AUD";
  }

  return jsonLd;
}
