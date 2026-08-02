import { getServerSession } from "next-auth";
import { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidStateCode, stateName } from "@/lib/auStates";
import { getLiveStates } from "@/lib/liveStates";
import { shouldShowVoteCounts } from "@/lib/voteVisibility";

export async function generateMetadata({
  params,
}: {
  params: { state: string; region: string };
}): Promise<Metadata> {
  const stateParam = params.state.toUpperCase();
  if (!isValidStateCode(stateParam)) return {};

  const regionMatch = await prisma.suburb.findFirst({
    where: { state: stateParam, region: { equals: params.region, mode: "insensitive" } },
    select: { region: true },
  });
  if (!regionMatch) return {};
  const region = regionMatch.region;
  const name = stateName(stateParam);
  const canonical = `/regions/${params.state.toLowerCase()}/${encodeURIComponent(region.toLowerCase())}`;

  const liveStates = await getLiveStates();

  return {
    title: `Lunch specials — ${region} ${name} | LunchSpecial`,
    description: `Crowdsourced lunch specials in ${region}, ${name} — browse what's on, posted by the community.`,
    alternates: { canonical },
    robots: liveStates.has(stateParam) ? undefined : { index: false, follow: true },
  };
}

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
  const name = stateName(stateParam);

  const liveStates = await getLiveStates();
  if (!liveStates.has(stateParam)) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">
          Lunch specials — {region} {name}
        </h1>
        <p className="text-gray-500 text-center py-12 max-w-md mx-auto">
          🇦🇺 Not here yet — LunchSpecial is one person building this, starting in Sydney/NSW. {name} is on the map
          for later, but there's nothing real to show yet, so this page is holding off for now.
        </p>
      </div>
    );
  }

  const showVoteCounts = await shouldShowVoteCounts();
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const [specials, suburbs, favorites] = await Promise.all([
    prisma.special.findMany({
      where: {
        hidden: false,
        needsReview: false,
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
        Lunch specials — {region} {name}
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
          <SpecialCard
            key={special.id}
            special={special as any}
            isFavorited={favoritedIds.has(special.id)}
            showVoteCounts={showVoteCounts}
          />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {region} {name} yet — be the first to post one.
          </p>
        )}
      </div>
    </div>
  );
}
