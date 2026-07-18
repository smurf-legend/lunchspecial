import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidStateCode, stateName } from "@/lib/auStates";

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const stateParam = params.state.toUpperCase();
  if (!isValidStateCode(stateParam)) return {};
  const name = stateName(stateParam);
  return {
    title: `Lunch specials in ${name} | LunchSpecial`,
    description: `Find and share the best lunch specials in ${name}, posted by the community.`,
    alternates: { canonical: `/${params.state.toLowerCase()}` },
  };
}

export default async function StatePage({ params }: { params: { state: string } }) {
  const stateParam = params.state.toUpperCase();
  if (!isValidStateCode(stateParam)) notFound();
  const name = stateName(stateParam);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const [suburbs, specials, favorites] = await Promise.all([
    prisma.suburb.findMany({ where: { state: stateParam }, orderBy: { name: "asc" } }),
    prisma.special.findMany({
      where: {
        hidden: false,
        OR: [{ suburbs: { some: { suburb: { state: stateParam } } } }, { chainWide: true }],
      },
      orderBy: { score: "desc" },
      take: 20,
      include: {
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: true } },
      },
    }),
    userId ? prisma.favorite.findMany({ where: { userId }, select: { specialId: true } }) : [],
  ]);
  const favoritedIds = new Set(favorites.map((f) => f.specialId));

  const regions = new Map<string, number>();
  for (const s of suburbs) regions.set(s.region, (regions.get(s.region) ?? 0) + 1);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Lunch specials in {name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {suburbs.length > 0
          ? `Covering ${suburbs.length} suburbs across ${regions.size} regions.`
          : `We haven't seeded suburbs for ${name} yet — check back soon, or be the first to post a chain-wide deal.`}
      </p>

      {regions.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {[...regions.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([region, count]) => (
              <Link
                key={region}
                href={`/regions/${params.state.toLowerCase()}/${encodeURIComponent(region.toLowerCase())}`}
                className="text-sm bg-white border px-3 py-1.5 rounded-full hover:bg-gray-50"
              >
                {region} <span className="text-gray-400">({count})</span>
              </Link>
            ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard key={special.id} special={special as any} isFavorited={favoritedIds.has(special.id)} />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {name} yet — be the first to{" "}
            <Link href="/specials/new" className="text-orange-600 underline">
              post one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
