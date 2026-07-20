import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminSpecialRow from "@/components/AdminSpecialRow";
import AdminAddSuburb from "@/components/AdminAddSuburb";
import AdminSuburbList from "@/components/AdminSuburbList";
import AdminSearch from "@/components/AdminSearch";
import AdminCategories from "@/components/AdminCategories";

const PAGE_SIZE = 50;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
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

  const q = searchParams.q?.trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);

  const where: any = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { venueName: { contains: q, mode: "insensitive" as const } },
          { suburbs: { some: { suburb: { name: { contains: q, mode: "insensitive" as const } } } } },
        ],
      }
    : {};

  const [specials, totalMatching, suburbs, categories, userCount, totalSpecials, totalComments, totalBlogPosts, needsReviewCount] =
    await Promise.all([
      prisma.special.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          author: { select: { name: true, email: true } },
          suburbs: { include: { suburb: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.special.count({ where }),
      prisma.suburb.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { specials: true } } } }),
      prisma.user.count(),
      prisma.special.count(),
      prisma.comment.count(),
      prisma.blogPost.count(),
      prisma.special.count({ where: { needsReview: true } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  function pageLink(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/kitchen?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-gray-500">
          {totalSpecials} specials · {suburbs.length} suburbs · {categories.length} categories ·{" "}
          <Link href="/kitchen/comments" className="text-orange-600 hover:underline">
            {totalComments} comments
          </Link>{" "}
          ·{" "}
          <Link href="/kitchen/users" className="text-orange-600 hover:underline">
            {userCount} users
          </Link>
          {" · "}
          <Link href="/kitchen/needs-review" className="text-orange-600 hover:underline">
            {needsReviewCount} needing review
          </Link>
          {" · "}
          <Link href="/kitchen/mailing-list" className="text-orange-600 hover:underline">
            Mailing list
          </Link>
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold text-lg">
            Table Talk
            <span className="text-gray-400 font-normal text-sm ml-2">
              ({totalBlogPosts} article{totalBlogPosts === 1 ? "" : "s"})
            </span>
          </h2>
          <div className="flex gap-2">
            <Link
              href="/kitchen/table-talk"
              className="text-gray-700 text-sm font-medium border rounded px-4 py-2 hover:bg-gray-50"
            >
              Manage articles
            </Link>
            <Link
              href="/kitchen/table-talk/new"
              className="bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-orange-700"
            >
              Write a new article
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold text-lg">
            {q ? `Search results for "${q}"` : "Recent lunch specials"}
            <span className="text-gray-400 font-normal text-sm ml-2">
              ({totalMatching} {totalMatching === 1 ? "match" : "matches"})
            </span>
          </h2>
          <AdminSearch />
        </div>
        <div className="bg-white rounded-lg border divide-y">
          {specials.map((special) => (
            <AdminSpecialRow key={special.id} special={special as any} />
          ))}
          {specials.length === 0 && (
            <p className="text-gray-400 text-sm p-4">
              {q ? "No specials match that search." : "No specials posted yet."}
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
            {page > 1 ? (
              <Link href={pageLink(page - 1)} className="border rounded px-3 py-1.5 hover:bg-gray-50">
                ← Previous
              </Link>
            ) : (
              <span className="border rounded px-3 py-1.5 text-gray-300">← Previous</span>
            )}
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageLink(page + 1)} className="border rounded px-3 py-1.5 hover:bg-gray-50">
                Next →
              </Link>
            ) : (
              <span className="border rounded px-3 py-1.5 text-gray-300">Next →</span>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Suburbs</h2>
        <div className="bg-white rounded-lg border p-4">
          <AdminSuburbList suburbs={suburbs} />
          <AdminAddSuburb />
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Cuisine categories</h2>
        <div className="bg-white rounded-lg border p-4">
          <AdminCategories categories={categories} />
        </div>
      </section>
    </div>
  );
}
