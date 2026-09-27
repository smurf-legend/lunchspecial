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
// 120s balances staleness against load: a brand-new special can take up to
// two minutes to show up on someone else's suburb page, but nothing here
// revalidates on write (no admin action calls revalidateTag), so don't
// lower this without also wiring that up.
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const REVALIDATE_SECONDS = 120;

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
  { revalidate: REVALIDATE_SECONDS }
);

export const getShouldShowVoteCountsCached = unstable_cache(
  async () => {
    const userCount = await prisma.user.count();
    return userCount >= 5; // matches MIN_USERS_TO_SHOW_VOTE_COUNTS in voteVisibility.ts
  },
  ["show-vote-counts"],
  { revalidate: REVALIDATE_SECONDS }
);

export const getSuburbBySlugCached = unstable_cache(
  (slug: string) => prisma.suburb.findUnique({ where: { slug } }),
  ["suburb-by-slug"],
  { revalidate: REVALIDATE_SECONDS }
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
  { revalidate: REVALIDATE_SECONDS }
);

export const getSuburbSpecialsCached = unstable_cache(
  (suburbId: string) =>
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburbId } } }, { chainWide: true }],
      },
      orderBy: { score: "desc" },
      take: 20,
      include: specialCardInclude,
    }),
  ["suburb-specials"],
  { revalidate: REVALIDATE_SECONDS }
);

export const getStateSuburbsCached = unstable_cache(
  (state: string) => prisma.suburb.findMany({ where: { state }, orderBy: { name: "asc" } }),
  ["state-suburbs"],
  { revalidate: REVALIDATE_SECONDS }
);

export const getStateSpecialsCached = unstable_cache(
  (state: string) =>
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
        OR: [{ suburbs: { some: { suburb: { state } } } }, { chainWide: true }],
      },
      orderBy: { score: "desc" },
      take: 20,
      include: specialCardInclude,
    }),
  ["state-specials"],
  { revalidate: REVALIDATE_SECONDS }
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
  { revalidate: REVALIDATE_SECONDS }
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
  { revalidate: REVALIDATE_SECONDS }
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
  { revalidate: REVALIDATE_SECONDS }
);

export const getSameChainRowsCached = unstable_cache(
  (url: string, excludeId: string) =>
    prisma.special.findMany({
      where: { url, id: { not: excludeId }, hidden: false, needsReview: false },
      select: { id: true, address: true, suburbs: { include: { suburb: true } } },
    }),
  ["same-chain-rows"],
  { revalidate: REVALIDATE_SECONDS }
);

export const getSameVenueSpecialsCached = unstable_cache(
  (venueName: string, address: string, excludeId: string) =>
    prisma.special.findMany({
      where: { venueName, address, id: { not: excludeId }, hidden: false, needsReview: false },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ["same-venue-specials"],
  { revalidate: REVALIDATE_SECONDS }
);
