import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidStateCode, stateName } from "@/lib/auStates";

export default async function RegionPage({ params }: { params: { state: string; region: string } }) {
  const stateParam = params.state.toUpperCase();
  if (!isValidStateCode(stateParam)) notFound();

  // Region names are freeform per state (seeded per rollout), so the valid
  // set is whatever's actually in the DB for this state, not a fixed list.
  const regionMatch = await prisma.suburb.findFirst({
    where: { state: stateParam, region: { equals: params.region, mode: "insensitive" } },
    select: { region: true },
  });
  if (!regionMatch) notFound();
  const region = regionMatch.region;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const [specials, suburbs, favorites] = await Promise.all([
    prisma.special.findMany({
      where: {
        hidden: false,
        OR: [
          { suburbs: { some: { suburb: { state: stateParam, region } } } },
          { chainWide: true },
        ],
      },
      orderBy: { score: "desc" },
      take: 20,
      include: {
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.suburb.findMany({ where: { state: stateParam, region }, orderBy: { name: "asc" } }),
    userId ? prisma.favorite.findMany({ where: { userId }, select: { specialId: true } }) : [],
  ]);
  const favoritedIds = new Set(favorites.map((f) => f.specialId));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">
        Lunch specials — {region} {stateName(stateParam)}
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Covering {suburbs.length} suburbs including{" "}
        {suburbs.slice(0, 5).map((s) => s.name).join(", ")}
        {suburbs.length > 5 ? " and more" : ""}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {suburbs.map((s) => (
          <Link
            key={s.slug}
            href={`/suburbs/${s.slug}`}
            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard key={special.id} special={special as any} isFavorited={favoritedIds.has(special.id)} />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {region} {stateName(stateParam)} yet — be the first to post one.
          </p>
        )}
      </div>
    </div>
  );
}
