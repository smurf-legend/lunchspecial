// Shared, non-personalized reads used by the homepage, suburb, state and
// special pages — wrapped in unstable_cache so a burst of crawler/bot hits
// (or the same page loading repeatedly) reuses one query result instead of
// hitting Postgres every single time. These pages already render dynamically
// per request (they read the session for favorites/admin state), so a plain
// `revalidate` export on the page has no effect — only caching the actual
// data fetch, separately from the per-request personalization, cuts the
// database load. User-specific reads (favorites, isAdmin, isAuthor) stay
// uncached and outside these functions.
//
// 7 days, because Neon suspends compute after ~5 idle minutes and every cache
// miss wakes it: crawlers asking for a different page each time kept it awake
// around the clock even with a 24-hour lifetime. This is only safe because
// every write made through the app busts the matching tag (see bustCache.ts),
// and a nightly job (/api/cron/warm-cache) refills the cache in one burst.
// Writes made by scripts straight to the database do not bust, so call
// /api/revalidate?warm=1 afterwards.
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { idFromSlug } from "@/lib/slugify";
import { getRelatedSpecials } from "@/lib/relatedSpecials";

const REVALIDATE_SECONDS = 604800;
const CATEGORIES_REVALIDATE_SECONDS = 604800;

const specialCardInclude = {
  suburbs: { include: { suburb: true } },
  categories: { include: { category: true } },
  _count: { select: { comments: true } },
} as const;

export const getLiveStatesCached = unstable_cache(
  async () => {
    const rows = await prisma.suburb.findMany({
      where: { specials: { some: { special: { hidden: false, needsReview: false } } } },
      select: { state: true },
      distinct: ["state"],
    });
    return rows.map((r) => r.state);
  },
  ["live-states"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSuburbBySlugCached = unstable_cache(
  (slug: string) => prisma.suburb.findUnique({ where: { slug } }),
  ["suburb-by-slug"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSuburbHasLocalSpecialCached = unstable_cache(
  async (suburbId: string) => {
    const row = await prisma.specialSuburb.findFirst({
      where: { suburbId, special: { hidden: false, needsReview: false } },
      select: { specialId: true },
    });
    return !!row;
  },
  ["suburb-has-local-special"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSuburbSpecialsCached = unstable_cache(
  (suburbId: string) =>
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburbId } } }, { chainWide: true }],
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: specialCardInclude,
    }),
  ["suburb-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getStateSuburbsCached = unstable_cache(
  (state: string) => prisma.suburb.findMany({ where: { state }, orderBy: { name: "asc" } }),
  ["state-suburbs"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getStateSpecialsCached = unstable_cache(
  (state: string) =>
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburb: { state } } } }, { chainWide: true }],
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: specialCardInclude,
    }),
  ["state-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

// Home page filters vary a lot (sort/suburb/category/location/price/state),
// so the cache key is the exact query shape rather than one fixed key —
// unstable_cache is fine with an arbitrary number of distinct keys, and the
// common case (bare "/" and a handful of popular filters) is what actually
// benefits, since that's what most crawler and repeat-visitor hits look like.
export const getHomeSpecialsCached = unstable_cache(
  async (where: any, orderBy: any, skip: number, take: number) => {
    const [specials, totalMatching] = await Promise.all([
      prisma.special.findMany({ where, orderBy, skip, take, include: specialCardInclude }),
      prisma.special.count({ where }),
    ]);
    return { specials, totalMatching };
  },
  ["home-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSpecialDetailCached = unstable_cache(
  (id: string) =>
    prisma.special.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, _count: { select: { specials: true, comments: true } } } },
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
      },
    }),
  ["special-detail"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSpecialCommentsCached = unstable_cache(
  (specialId: string) =>
    prisma.comment.findMany({
      where: { specialId },
      include: {
        author: { select: { name: true, _count: { select: { specials: true, comments: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ["special-comments"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSameChainRowsCached = unstable_cache(
  (url: string, excludeId: string) =>
    prisma.special.findMany({
      where: { url, id: { not: excludeId }, hidden: false, needsReview: false },
      select: { id: true, address: true, suburbs: { include: { suburb: true } } },
    }),
  ["same-chain-rows"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getSameVenueSpecialsCached = unstable_cache(
  (venueName: string, address: string, excludeId: string) =>
    prisma.special.findMany({
      where: { venueName, address, id: { not: excludeId }, hidden: false, needsReview: false },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ["same-venue-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getCategoriesCached = unstable_cache(
  () => prisma.category.findMany({ orderBy: { name: "asc" } }),
  ["categories-all"],
  { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: ["categories"] }
);

export const getSuburbDealCountCached = unstable_cache(
  (suburbId: string) =>
    prisma.special.count({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburbId } } }, { chainWide: true }],
      },
    }),
  ["suburb-deal-count"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

// Table Talk post fields the share image needs. Falls back to the old slug
// column for legacy links with no id suffix, same as the post page itself.
export const getBlogPostForShareImageCached = unstable_cache(
  async (slugParam: string) => {
    const select = { title: true, excerpt: true, imageUrl: true, hidden: true } as const;
    const post = await prisma.blogPost.findUnique({ where: { id: idFromSlug(slugParam) }, select });
    if (post) return post;
    return prisma.blogPost.findUnique({ where: { slug: slugParam }, select });
  },
  ["blog-post-share-image"],
  { revalidate: REVALIDATE_SECONDS, tags: ["blog"] }
);

export const getLiveSuburbSlugsCached = unstable_cache(
  async () => {
    const rows = await prisma.suburb.findMany({
      where: { specials: { some: { special: { hidden: false, needsReview: false } } } },
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    return rows.map((r) => r.slug);
  },
  ["live-suburb-slugs"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getRegionMatchCached = unstable_cache(
  (state: string, region: string) =>
    prisma.suburb.findFirst({
      where: { state, region: { equals: region, mode: "insensitive" } },
      select: { region: true },
    }),
  ["region-match"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getRegionSpecialsCached = unstable_cache(
  (state: string, region: string) =>
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburb: { state, region } } } }, { chainWide: true }],
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: specialCardInclude,
    }),
  ["region-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

export const getRegionSuburbsCached = unstable_cache(
  (state: string, region: string) =>
    prisma.suburb.findMany({ where: { state, region }, orderBy: { name: "asc" } }),
  ["region-suburbs"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);

// All visible posts including future-dated ones: the page filters on publishAt
// at render time, so a scheduled article still appears on time.
export const getBlogListCached = unstable_cache(
  () =>
    prisma.blogPost.findMany({
      where: { hidden: false },
      include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
  ["blog-list"],
  { revalidate: REVALIDATE_SECONDS, tags: ["blog"] }
);

export const getBlogPostCached = unstable_cache(
  async (slugParam: string) => {
    const include = { author: { select: { name: true } } } as const;
    const post = await prisma.blogPost.findUnique({ where: { id: idFromSlug(slugParam) }, include });
    if (post) return post;
    return prisma.blogPost.findUnique({ where: { slug: slugParam }, include });
  },
  ["blog-post"],
  { revalidate: REVALIDATE_SECONDS, tags: ["blog"] }
);

export const getBlogCommentsCached = unstable_cache(
  (blogPostId: string) =>
    prisma.blogComment.findMany({
      where: { blogPostId },
      include: { author: { select: { name: true, _count: { select: { specials: true, comments: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
  ["blog-comments"],
  { revalidate: REVALIDATE_SECONDS, tags: ["blog"] }
);

export const getRelatedSpecialsCached = unstable_cache(
  (title: string) => getRelatedSpecials(title),
  ["related-specials"],
  { revalidate: REVALIDATE_SECONDS, tags: ["specials"] }
);
