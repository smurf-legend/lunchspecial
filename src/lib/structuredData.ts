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
  upvoteCount?: number;
  downvoteCount?: number;
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

  // Only emit a rating when there's at least one real vote — Google's
  // structured data guidelines require a genuine value, not a placeholder,
  // and a 0-count rating would look fabricated rather than just absent.
  const totalVotes = (special.upvoteCount ?? 0) + (special.downvoteCount ?? 0);
  if (totalVotes > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      // Maps 0% yummy votes to 1 star and 100% to 5 stars, rather than a
      // 0-5 scale, since schema.org's ratingValue is expected to sit
      // between worstRating and bestRating (default worst is 1, not 0).
      ratingValue: Number((1 + (special.upvoteCount! / totalVotes) * 4).toFixed(1)),
      bestRating: 5,
      worstRating: 1,
      ratingCount: totalVotes,
    };
  }

  return jsonLd;
}

type BlogPostingJsonLdInput = {
  url: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  authorName: string;
  datePublished: Date | string;
  dateModified: Date | string;
};

export function buildBlogPostingJsonLd(post: BlogPostingJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: post.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url },
    datePublished: new Date(post.datePublished).toISOString(),
    dateModified: new Date(post.dateModified).toISOString(),
    author: { "@type": "Person", name: post.authorName },
    // No logo asset exists to reference yet — omitting publisher.logo
    // entirely rather than pointing it at the 1200x630 OG social card,
    // which fails Google's ~1:1 recommended shape for a publisher logo.
    publisher: { "@type": "Organization", name: "LunchSpecial" },
  };

  if (post.imageUrl) jsonLd.image = post.imageUrl;

  return jsonLd;
}

// Breadcrumbs are what let Google show the little "Home > Suburb > Special"
// path in place of a bare URL under a search result — items are just
// {name, url} in order, Home first, current page last.
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
