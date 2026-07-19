import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClearReviewButton from "@/components/ClearReviewButton";

export default async function NeedsReviewPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to view this page.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p>You don't have access to the admin panel.</p>
      </div>
    );
  }

  const specials = await prisma.special.findMany({
    where: { needsReview: true },
    orderBy: { createdAt: "asc" },
    include: { suburbs: { include: { suburb: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Needs review</h1>
        <p className="text-sm text-gray-500">
          Specials that couldn't be confirmed automatically — no reliable source found online, or the
          claimed deal couldn't be verified. Click a title to edit it directly, then "Mark resolved"
          once you're done to clear it from this list.
        </p>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {specials.map((special) => (
          <div key={special.id} className="flex items-center justify-between p-3 text-sm gap-3">
            <div>
              <Link
                href={`/kitchen/specials/${special.id}/edit`}
                className="font-medium hover:text-orange-600"
              >
                {special.title}
              </Link>
              <p className="text-gray-500 text-xs">
                {special.venueName} · {special.suburbs[0]?.suburb.name ?? "no suburb"}
              </p>
              {special.needsReviewNote && (
                <p className="text-amber-700 text-xs mt-1">{special.needsReviewNote}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/kitchen/specials/${special.id}/edit`}
                className="bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-orange-700 shrink-0"
              >
                Edit
              </Link>
              <ClearReviewButton specialId={special.id} />
            </div>
          </div>
        ))}
        {specials.length === 0 && (
          <p className="text-gray-400 text-sm p-4">Nothing flagged for review right now.</p>
        )}
      </div>
    </div>
  );
}
