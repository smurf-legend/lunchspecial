import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { specialSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";

// Without this, Next treats the route as static (no dynamic APIs are used
// in it) and generates it once at build/deploy time — new specials/articles
// posted by users between deploys would never show up. Revalidating hourly
// keeps it fresh without hitting the DB on every single crawler request.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [specials, suburbs, posts, stateRegions] = await Promise.all([
    prisma.special.findMany({
      where: { hidden: false },
      select: { id: true, title: true, venueName: true, createdAt: true },
    }),
    prisma.suburb.findMany({ select: { slug: true } }),
    prisma.blogPost.findMany({
      where: { hidden: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.suburb.findMany({ select: { state: true, region: true }, distinct: ["state", "region"] }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/table-talk`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const specialRoutes: MetadataRoute.Sitemap = specials.map((s) => ({
    url: `${SITE_URL}/specials/${specialSlug(s)}`,
    lastModified: s.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const suburbRoutes: MetadataRoute.Sitemap = suburbs.map((s) => ({
    url: `${SITE_URL}/suburbs/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const states = [...new Set(stateRegions.map((r) => r.state))];
  const stateRoutes: MetadataRoute.Sitemap = states.map((state) => ({
    url: `${SITE_URL}/${state.toLowerCase()}`,
    changeFrequency: "daily",
    priority: 0.65,
  }));

  const regionRoutes: MetadataRoute.Sitemap = stateRegions.map((r) => ({
    url: `${SITE_URL}/regions/${r.state.toLowerCase()}/${encodeURIComponent(r.region.toLowerCase())}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/table-talk/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...specialRoutes, ...suburbRoutes, ...stateRoutes, ...regionRoutes, ...blogRoutes];
}
