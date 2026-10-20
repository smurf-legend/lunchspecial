import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getLiveSuburbSlugsCached } from "@/lib/cachedQueries";

// Rendered per request (the data underneath is cached) so the list of suburb
// pages crawlers may visit follows the database instead of being frozen at
// build time.
export const dynamic = "force-dynamic";

const DISALLOW = [
  "/api/",
  "/kitchen/",
  "/profile",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/favorites",
  "/notifications",
  "/unsubscribed",
  "/my-specials",
  "/specials/*/edit",
  // Filtered homepage URLs (?suburb=, ?category=, ...) are canonicalised to "/"
  // and never indexed, but every combination is a fresh database query when a
  // crawler follows it.
  "/*?*sort=",
  "/*?*suburb=",
  "/*?*category=",
  "/*?*location=",
  "/*?*price=",
  "/*?*greatValue=",
  "/*?*state=",
  "/*?*page=",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // ~17,000 suburb pages exist and are linked from region pages, but only the
  // ones with a real local special are indexable. Crawlers walking the rest
  // each cost a database query, so only the live ones are left open. If the
  // database is unreachable, fall back to not restricting suburbs at all
  // rather than risk a robots.txt error, which crawlers treat as "stay away".
  let liveSuburbs: string[] | null = null;
  try {
    liveSuburbs = await getLiveSuburbSlugsCached();
  } catch {
    liveSuburbs = null;
  }

  return {
    rules: [
      // SEO-tool and China-only search crawlers: no visitors for this site, and
      // together they were ~18% of all requests (and database wake-ups).
      { userAgent: ["PetalBot", "AhrefsBot"], disallow: "/" },
      {
        userAgent: "*",
        allow: ["/", ...(liveSuburbs ?? []).map((slug) => `/suburbs/${slug}`)],
        disallow: [...DISALLOW, ...(liveSuburbs ? ["/suburbs/"] : [])],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
