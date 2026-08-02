import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import CategoryFilter from "@/components/CategoryFilter";
import { stateCodeFromRegionName } from "@/lib/auStates";
import { getLiveStates } from "@/lib/liveStates";
import { shouldShowVoteCounts } from "@/lib/voteVisibility";

// Each tier also matches range-priced specials (a whole specials menu
// rather than one item) — "under" tiers check the range's low end (does
// it have anything that cheap), "over" checks the high end.
const PRICE_TIERS: Record<string, { label: string; where: any; rangeField: "priceRangeMin" | "priceRangeMax" }> = {
  under10: { label: "Under $10", where: { lt: 10 }, rangeField: "priceRangeMin" },
  under15: { label: "Under $15", where: { lt: 15 }, rangeField: "priceRangeMin" },
  under20: { label: "Under $20", where: { lt: 20 }, rangeField: "priceRangeMin" },
  under25: { label: "Under $25", where: { lt: 25 }, rangeField: "priceRangeMin" },
  over25: { label: "Over $25", where: { gte: 25 }, rangeField: "priceRangeMax" },
};

const OLDIE_MIN_AGE_DAYS = 30;

export default async function HomePage({
  searchParams,
}: {
  searchParams: {
    sort?: string;
    suburb?: string;
    category?: string;
    location?: string;
    price?: string;
    greatValue?: string;
    state?: string;
    page?: string;
  };
}) {
  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const showVoteCounts = await shouldShowVoteCounts();
  // No sort param at all is a genuine neutral state (neither toggle shown as
  // active) — distinct from "hot", which is an explicit choice that happens
  // to use the same underlying order. Using undefined rather than a "none"
  // string keeps a plain "/" URL free of a leftover "sort=none" param.
  const sort =
    searchParams.sort === "new"
      ? "new"
      : searchParams.sort === "oldie"
      ? "oldie"
      : searchParams.sort === "hot"
      ? "hot"
      : undefined;
  const suburbSlug = searchParams.suburb;
  const categorySlug = searchParams.category;
  const location = searchParams.location?.trim();
  const isPostcode = !!location && /^\d{4}$/.test(location);
  const priceTier = searchParams.price && PRICE_TIERS[searchParams.price] ? searchParams.price : undefined;
  const greatValueOnly = searchParams.greatValue === "1";

  // Look up matching suburbs before building the filter so we know whether
  // the search box's text refers to a real place (a location search, which
  // also surfaces chain-wide deals available everywhere) or should just
  // fall through to a keyword match against title/description/venue — one
  // search box covers both "where" and "what" instead of two separate ones.
  const matchedSuburbs = location
    ? await prisma.suburb.findMany({
        where: isPostcode ? { postcode: location } : { name: { contains: location, mode: "insensitive" as const } },
      })
    : [];

  const liveStates = await getLiveStates();

  // No explicit filters at all means a fresh visit — try to default to the
  // visitor's own state via Vercel's edge geolocation header, but only if
  // that state is actually live (has real local specials), so nobody lands
  // on an empty page just because we detected e.g. Queensland — suburbs are
  // seeded nationwide already, but content isn't, so seeding alone isn't
  // enough to auto-select a state.
  const noExplicitFilter = !searchParams.state && !suburbSlug && !location && !categorySlug;
  let detectedState: string | null = null;
  if (noExplicitFilter) {
    const regionHeader = headers().get("x-vercel-ip-country-region");
    const candidate = stateCodeFromRegionName(regionHeader);
    if (candidate && liveStates.has(candidate)) detectedState = candidate;
  }
  const stateFilter = (searchParams.state?.toUpperCase() && searchParams.state !== "all"
    ? searchParams.state.toUpperCase()
    : detectedState) as string | null;

  const and: any[] = [{ hidden: false, needsReview: false }];
  if (suburbSlug) {
    and.push({ OR: [{ suburbs: { some: { suburb: { slug: suburbSlug } } } }, { chainWide: true }] });
  }
  if (stateFilter) {
    and.push({ OR: [{ suburbs: { some: { suburb: { state: stateFilter } } } }, { chainWide: true }] });
  }
  if (location) {
    and.push({
      OR: [
        // Only bring in the suburb/chain-wide match when the text actually
        // matched a real suburb — otherwise a keyword like "banh mi" would
        // wrongly pull in every chain-wide special regardless of relevance.
        ...(matchedSuburbs.length > 0
          ? [
              { suburbs: { some: { suburb: { id: { in: matchedSuburbs.map((s) => s.id) } } } } },
              { chainWide: true },
            ]
          : []),
        { title: { contains: location, mode: "insensitive" as const } },
        { description: { contains: location, mode: "insensitive" as const } },
        { venueName: { contains: location, mode: "insensitive" as const } },
      ],
    });
  }
  if (categorySlug) and.push({ categories: { some: { category: { slug: categorySlug } } } });
  if (priceTier) {
    const tier = PRICE_TIERS[priceTier];
    and.push({ OR: [{ specialPrice: tier.where }, { [tier.rangeField]: tier.where }] });
  }
  if (greatValueOnly) and.push({ greatValue: true });
  if (sort === "oldie") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - OLDIE_MIN_AGE_DAYS);
    and.push({ createdAt: { lte: cutoff } });
  }
  const where: any = and.length > 0 ? { AND: and } : {};

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const [specials, totalMatching, categories, favorites] = await Promise.all([
    prisma.special.findMany({
      where,
      orderBy: sort === "new" ? { createdAt: "desc" } : { score: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.special.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    userId ? prisma.favorite.findMany({ where: { userId }, select: { specialId: true } }) : [],
  ]);
  const favoritedIds = new Set(favorites.map((f) => f.specialId));
  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  // A keyword that doesn't substring-match anything (a typo, a plural, a
  // slightly different word order) otherwise dead-ends at "no results" even
  // when a close match exists — fall back to trigram similarity, but only
  // for a plain keyword search with nothing else narrowing it down, so a
  // typo'd suburb name doesn't surface unrelated specials from elsewhere.
  let fuzzyMatches: typeof specials = [];
  const isPureKeywordSearch =
    !!location &&
    matchedSuburbs.length === 0 &&
    !suburbSlug &&
    !categorySlug &&
    !priceTier &&
    !greatValueOnly &&
    sort !== "oldie" &&
    !searchParams.state;
  if (isPureKeywordSearch && totalMatching === 0) {
    const candidates = await prisma.$queryRaw<{ id: string; sim: number }[]>`
      SELECT id, GREATEST(
        similarity(unaccent(title), unaccent(${location})),
        similarity(unaccent("venueName"), unaccent(${location}))
      ) AS sim
      FROM "Special"
      WHERE hidden = false AND "needsReview" = false
      ORDER BY sim DESC
      LIMIT 5
    `;
    const relevantIds = candidates.filter((c) => c.sim > 0.15).map((c) => c.id);
    if (relevantIds.length > 0) {
      const rows = await prisma.special.findMany({
        where: { id: { in: relevantIds } },
        include: {
          suburbs: { include: { suburb: true } },
          categories: { include: { category: true } },
          _count: { select: { comments: true } },
        },
      });
      const rank = new Map(relevantIds.map((id, i) => [id, i]));
      fuzzyMatches = rows.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
  }
  const displaySpecials = specials.length > 0 ? specials : fuzzyMatches;

  function buildLink(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      sort,
      suburb: suburbSlug,
      category: categorySlug,
      price: priceTier,
      greatValue: greatValueOnly ? "1" : undefined,
      location,
      state: searchParams.state,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-start gap-2 text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-2 mb-3">
        <span>
          🇦🇺 The goal is to cover all of Australia — right now LunchSpecial is one person building this, starting
          in Sydney/NSW. More states as it grows.
        </span>
      </div>

      {/* State filter banner + state pills hidden while coverage is NSW-only
          — no point announcing/offering a state switcher with nothing to
          switch to yet. The underlying stateFilter/liveStates logic stays
          intact (still drives geo-detection and ?state= filtering), this
          just stops rendering the UI for it. Revisit once another state
          actually has content. */}

      <div className="flex gap-3 flex-wrap items-center">
        <CategoryFilter categories={categories} />
      </div>

      {location && (
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          <span className="bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1.5">
            {matchedSuburbs.length > 0
              ? `📍 ${matchedSuburbs.map((s) => s.name).join(", ")}`
              : `🔍 "${location}"`}
            <Link
              href={buildLink({ location: undefined })}
              className="text-gray-400 hover:text-gray-900 font-bold px-1"
              aria-label="Clear search"
            >
              ×
            </Link>
          </span>
        </div>
      )}

      <div className="flex gap-2 mb-2 mt-3 flex-wrap">
        <Link
          href={buildLink({ greatValue: greatValueOnly ? undefined : "1" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            greatValueOnly ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          💎 Everyday Value
        </Link>
        {Object.entries(PRICE_TIERS).map(([key, { label }]) => (
          <Link
            key={key}
            href={priceTier === key ? buildLink({ price: undefined }) : buildLink({ price: key })}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              priceTier === key ? "bg-orange-600 text-white" : "bg-white border"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 mb-4 mt-1">
        <Link
          href={buildLink({ sort: sort === "hot" ? undefined : "hot" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            sort === "hot" ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          🔥 Most Popular
        </Link>
        <Link
          href={buildLink({ sort: sort === "new" ? undefined : "new" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            sort === "new" ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          🆕 Newest
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {specials.length === 0 && fuzzyMatches.length > 0 && (
          <p className="text-gray-500 text-sm">
            No exact matches for &ldquo;{location}&rdquo; — here&rsquo;s what&rsquo;s close:
          </p>
        )}
        {displaySpecials.map((special) => (
          <SpecialCard
            key={special.id}
            special={special as any}
            isFavorited={favoritedIds.has(special.id)}
            contextSuburbSlug={suburbSlug ?? matchedSuburbs[0]?.slug}
            showVoteCounts={showVoteCounts}
          />
        ))}
        {displaySpecials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            {suburbSlug || categorySlug || location || priceTier || greatValueOnly || stateFilter || sort === "oldie" ? (
              "No lunch specials match those filters yet."
            ) : (
              <>
                No lunch specials yet — be the first to{" "}
                <Link href="/specials/new" className="text-orange-600 underline">
                  post one
                </Link>
                .
              </>
            )}
          </p>
        )}
        {specials.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2 text-sm">
            {page > 1 ? (
              <Link
                href={buildLink({ page: String(page - 1) })}
                className="bg-white border px-4 py-2 rounded font-medium hover:bg-gray-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-4 py-2 text-gray-300">← Previous</span>
            )}
            <span className="text-gray-500">
              Page {page} of {totalPages} · {totalMatching} deal{totalMatching === 1 ? "" : "s"}
            </span>
            {page < totalPages ? (
              <Link
                href={buildLink({ page: String(page + 1) })}
                className="bg-white border px-4 py-2 rounded font-medium hover:bg-gray-50"
              >
                Next →
              </Link>
            ) : (
              <span className="px-4 py-2 text-gray-300">Next →</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
