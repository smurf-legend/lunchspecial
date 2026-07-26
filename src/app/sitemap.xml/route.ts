import { prisma } from "@/lib/prisma";
import { specialSlug, blogPostSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";

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
  const [specials, hasChainWide, posts, stateRegions] = await Promise.all([
    prisma.special.findMany({
      where: { hidden: false },
      select: { id: true, title: true, venueName: true, createdAt: true, imageUrl: true, extraImageUrls: true },
    }),
    prisma.special.count({ where: { hidden: false, chainWide: true } }).then((c) => c > 0),
    prisma.blogPost.findMany({
      where: { hidden: false },
      select: { id: true, title: true, updatedAt: true, imageUrl: true },
    }),
    prisma.suburb.findMany({ select: { state: true, region: true }, distinct: ["state", "region"] }),
  ]);

  // A chain-wide special (e.g. a McDonald's deal) shows up on every suburb
  // page regardless of that suburb's own specials, so it makes every page
  // non-empty. Without one, only suburbs with a direct special have real
  // content — with several thousand suburbs now loaded nationally (most
  // with no locally-posted deals yet), including all of them unconditionally
  // would flood the sitemap with thin/empty pages.
  const suburbs = await prisma.suburb.findMany({
    where: hasChainWide ? {} : { specials: { some: { special: { hidden: false } } } },
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
