import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import LocationSearch from "@/components/LocationSearch";

const PRICE_TIERS: Record<string, { label: string; where: any }> = {
  under10: { label: "Under $10", where: { lt: 10 } },
  under15: { label: "Under $15", where: { lt: 15 } },
  under20: { label: "Under $20", where: { lt: 20 } },
  over20: { label: "Over $20", where: { gte: 20 } },
};

const OLDIE_MIN_AGE_DAYS = 30;

export default async function HomePage({
  searchParams,
}: {
  searchParams: {
    sort?: string;
    q?: string;
    suburb?: string;
    category?: string;
    location?: string;
    price?: string;
    greatValue?: string;
  };
}) {
  const sort = searchParams.sort === "new" ? "new" : searchParams.sort === "oldie" ? "oldie" : "hot";
  const q = searchParams.q?.trim();
  const suburbSlug = searchParams.suburb;
  const categorySlug = searchParams.category;
  const location = searchParams.location?.trim();
  const isPostcode = !!location && /^\d{4}$/.test(location);
  const priceTier = searchParams.price && PRICE_TIERS[searchParams.price] ? searchParams.price : undefined;
  const greatValueOnly = searchParams.greatValue === "1";

  const and: any[] = [{ hidden: false }];
  if (suburbSlug) {
    and.push({ OR: [{ suburbs: { some: { suburb: { slug: suburbSlug } } } }, { chainWide: true }] });
  }
  if (location) {
    and.push({
      OR: [
        {
          suburbs: {
            some: {
              suburb: isPostcode
                ? { postcode: location }
                : { name: { contains: location, mode: "insensitive" as const } },
            },
          },
        },
        { chainWide: true },
      ],
    });
  }
  if (categorySlug) and.push({ categories: { some: { category: { slug: categorySlug } } } });
  if (priceTier) and.push({ specialPrice: PRICE_TIERS[priceTier].where });
  if (greatValueOnly) and.push({ greatValue: true });
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { venueName: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (sort === "oldie") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - OLDIE_MIN_AGE_DAYS);
    and.push({ createdAt: { lte: cutoff } });
  }
  const where: any = and.length > 0 ? { AND: and } : {};

  const matchedSuburbs = location
    ? await prisma.suburb.findMany({
        where: isPostcode ? { postcode: location } : { name: { contains: location, mode: "insensitive" as const } },
      })
    : [];

  const [specials, categories] = await Promise.all([
    prisma.special.findMany({
      where,
      orderBy: sort === "new" ? { createdAt: "desc" } : { score: "desc" },
      take: 20,
      include: {
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  function buildLink(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      sort,
      q,
      suburb: suburbSlug,
      category: categorySlug,
      price: priceTier,
      greatValue: greatValueOnly ? "1" : undefined,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/?${params.toString()}`;
  }

  return (
    <div>
      <LocationSearch />

      <div className="flex gap-3 flex-wrap items-center">
        <CategoryFilter categories={categories} />
        <SearchBar />
      </div>

      {location && (
        <p className="text-xs text-gray-500 mt-2">
          {matchedSuburbs.length > 0
            ? `Showing ${matchedSuburbs.map((s) => s.name).join(", ")}`
            : isPostcode
            ? `We don't have suburb data for postcode ${location} yet.`
            : `No suburb matching "${location}" yet.`}
        </p>
      )}

      <div className="flex gap-2 mb-2 mt-3 flex-wrap">
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
        <Link
          href={buildLink({ greatValue: greatValueOnly ? undefined : "1" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            greatValueOnly ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          💎 Everyday Value
        </Link>
      </div>

      <div className="flex gap-2 mb-4 mt-1">
        <Link
          href={buildLink({ sort: "hot" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            sort === "hot" ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          🔥 Hot
        </Link>
        <Link
          href={buildLink({ sort: "new" })}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            sort === "new" ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          🆕 New
        </Link>
        <Link
          href={buildLink({ sort: "oldie" })}
          title="Posted 30+ days ago, sorted by score — proven recurring deals"
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            sort === "oldie" ? "bg-orange-600 text-white" : "bg-white border"
          }`}
        >
          ⭐ Oldie but goodie
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard
            key={special.id}
            special={special as any}
            contextSuburbSlug={suburbSlug ?? matchedSuburbs[0]?.slug}
          />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            {q || suburbSlug || categorySlug || location || priceTier || greatValueOnly || sort === "oldie" ? (
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
      </div>
    </div>
  );
}
