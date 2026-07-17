export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// SEO-friendly URL for a special's detail page — a readable slug with the
// real database id appended. The id is what's actually looked up; the slug
// text is decorative, so stale text from an old title never breaks a link
// (see idFromSlug below, used on the receiving page).
export function specialSlug(special: { id: string; title: string; venueName: string }) {
  return `${slugify(`${special.title} ${special.venueName}`)}-${special.id}`;
}

// Recovers the id from a `/specials/[param]` route param, whether it's a
// bare id (old-style links) or a slug-prefixed one — the id has no hyphens,
// so it's always the trailing segment.
export function idFromSlug(param: string) {
  return param.split("-").pop()!;
}
