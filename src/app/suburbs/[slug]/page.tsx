import { getServerSession } from "next-auth";
import { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const suburb = await prisma.suburb.findUnique({ where: { slug: params.slug } });
  if (!suburb) return {};

  const title = `Lunch specials in ${suburb.name} | LunchSpecial`;
  const description = `Crowdsourced lunch specials near ${suburb.name}, ${suburb.state} — browse what's on, posted by the community.`;
  const canonical = `/suburbs/${suburb.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "LunchSpecial", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SuburbPage({ params }: { params: { slug: string } }) {
  const suburb = await prisma.suburb.findUnique({ where: { slug: params.slug } });
  if (!suburb) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const [specials, favorites] = await Promise.all([
    prisma.special.findMany({
      where: {
        hidden: false,
        OR: [{ suburbs: { some: { suburbId: suburb.id } } }, { chainWide: true }],
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

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Lunch specials in {suburb.name}</h1>
      <p className="text-sm text-gray-500 mb-4">{suburb.postcode}, {suburb.state}</p>
      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard
            key={special.id}
            special={special as any}
            contextSuburbSlug={suburb.slug}
            isFavorited={favoritedIds.has(special.id)}
          />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {suburb.name} yet — be the first to post one.
          </p>
        )}
      </div>
    </div>
  );
}
