import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import DeleteSpecialButton from "@/components/DeleteSpecialButton";
import { shouldShowVoteCounts } from "@/lib/voteVisibility";

export default async function MySpecialsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to view your posts.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  const userId = (session.user as any).id as string;

  const specials = await prisma.special.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      _count: { select: { comments: true } },
    },
  });
  const showVoteCounts = await shouldShowVoteCounts();

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Your posts</h1>
      <p className="text-sm text-gray-500 mb-4">
        Lunch specials you've posted — including hidden or under-review ones not shown publicly.
      </p>
      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <div key={special.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {special.hidden && (
                <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs font-medium">
                  Hidden by moderation
                </span>
              )}
              {special.needsReview && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                  Needs review
                </span>
              )}
              <Link
                href={`/specials/${special.id}/edit`}
                className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-gray-800 text-white border-gray-800"
              >
                ✏️ Edit
              </Link>
              <DeleteSpecialButton specialId={special.id} title={special.title} apiBase="/api/specials" />
            </div>
            <SpecialCard special={special as any} showVoteCounts={showVoteCounts} />
          </div>
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            You haven't posted any lunch specials yet.{" "}
            <Link href="/specials/new" className="text-orange-600 underline font-medium">
              Post one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
