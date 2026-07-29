import { prisma } from "@/lib/prisma";
import { specialSlug, blogPostSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";
import { getLiveStates } from "@/lib/liveStates";

// Without this, Next treats the route as static (no dynamic APIs are used
// in it) and generates it once at build/deploy time — new specials/articles
// posted by users between deploys would never show up. Revalidating hourly
// keeps it fresh without hitting the DB on every single crawler request.
export const revalidate = 3600;

// A plain route handler rather than the sitemap.ts file convention — the
// convention's MetadataRoute.Sitemap type has no field for the Google image
// sitemap extension (xmlns:image / <image:image>), which is what actually
// gets Special and Table Talk photos surfaced in Google Images search. XML
// has to be built by hand to add that namespace.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Entry = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: string;
  priority?: number;
  // The sitemap image extension allows multiple <image:image> blocks per
  // <url> — a Special's extra gallery photos are just as indexable as its
  // cover photo, so all of them go in, not just the primary imageUrl.
  images?: (string | null | undefined)[];
};

function entryXml(e: Entry): string {
  const parts = [`<loc>${escapeXml(e.url)}</loc>`];
  if (e.lastModified) parts.push(`<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>`);
  if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
  if (e.priority != null) parts.push(`<priority>${e.priority}</priority>`);
  for (const image of e.images ?? []) {
    if (image) parts.push(`<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`);
  }
  return `<url>${parts.join("")}</url>`;
}

export async function GET() {
  const [specials, posts, allStateRegions, liveStates] = await Promise.all([
    prisma.special.findMany({
      where: { hidden: false, needsReview: false },
      select: { id: true, title: true, venueName: true, createdAt: true, imageUrl: true, extraImageUrls: true },
    }),
    prisma.blogPost.findMany({
      where: { hidden: false },
      select: { id: true, title: true, updatedAt: true, imageUrl: true },
    }),
    prisma.suburb.findMany({ select: { state: true, region: true }, distinct: ["state", "region"] }),
    getLiveStates(),
  ]);

  // Suburbs are seeded nationwide, but real local specials aren't — a state/
  // region route with no live content renders the same generic "coming
  // soon" body as every other one, same duplicate-content problem as the
  // suburb-level fix above, just one level up. Only list what's actually
  // indexable (matches the noindex decision in each page's generateMetadata).
  const stateRegions = allStateRegions.filter((r) => liveStates.has(r.state));

  // A chain-wide special (e.g. a Rashays deal) shows up on every suburb page
  // regardless of that suburb's own specials, so a suburb with no locally-
  // posted deal still renders "non-empty" — but its body content is just the
  // same chain-wide listings duplicated verbatim across thousands of other
  // suburbs, not anything unique to that suburb. Only a direct local special
  // (a real SpecialSuburb join row) makes a suburb page worth indexing —
  // basing this on chain-wide presence was backwards and had been flooding
  // the sitemap with ~17k near-duplicate pages.
  const suburbs = await prisma.suburb.findMany({
    where: { specials: { some: { special: { hidden: false, needsReview: false } } } },
    select: { slug: true },
  });

  const staticRoutes: Entry[] = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/table-talk`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const specialRoutes: Entry[] = specials.map((s) => ({
    url: `${SITE_URL}/specials/${specialSlug(s)}`,
    lastModified: s.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
    images: [s.imageUrl, ...s.extraImageUrls],
  }));

  const suburbRoutes: Entry[] = suburbs.map((s) => ({
    url: `${SITE_URL}/suburbs/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const states = [...new Set(stateRegions.map((r) => r.state))];
  const stateRoutes: Entry[] = states.map((state) => ({
    url: `${SITE_URL}/${state.toLowerCase()}`,
    changeFrequency: "daily",
    priority: 0.65,
  }));

  const regionRoutes: Entry[] = stateRegions.map((r) => ({
    url: `${SITE_URL}/regions/${r.state.toLowerCase()}/${encodeURIComponent(r.region.toLowerCase())}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const blogRoutes: Entry[] = posts.map((p) => ({
    url: `${SITE_URL}/table-talk/${blogPostSlug(p)}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
    images: [p.imageUrl],
  }));

  const allRoutes = [...staticRoutes, ...specialRoutes, ...suburbRoutes, ...stateRoutes, ...regionRoutes, ...blogRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allRoutes.map(entryXml).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
