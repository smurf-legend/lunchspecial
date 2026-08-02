import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import { shouldShowVoteCounts } from "@/lib/voteVisibility";

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to view your favourites.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  const userId = (session.user as any).id as string;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      special: {
        include: {
          suburbs: { include: { suburb: true } },
          categories: { include: { category: true } },
          _count: { select: { comments: true } },
        },
      },
    },
  });

  // A favorited special can later be hidden by moderation — skip those
  // rather than showing a broken/inaccessible card in someone's own list.
  const specials = favorites.map((f) => f.special).filter((s) => !s.hidden);
  const showVoteCounts = await shouldShowVoteCounts();

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Your favourites</h1>
      <p className="text-sm text-gray-500 mb-4">
        Deals you've saved to come back to later.
      </p>
      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard key={special.id} special={special as any} isFavorited showVoteCounts={showVoteCounts} />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No favourites yet — tap "Add to favourites" on any special to save it here.
          </p>
        )}
      </div>
    </div>
  );
}
