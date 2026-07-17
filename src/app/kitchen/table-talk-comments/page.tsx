import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminCommentRow from "@/components/AdminCommentRow";
import AdminSearch from "@/components/AdminSearch";

const PAGE_SIZE = 50;

export default async function AdminBlogCommentsPage({
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
          { body: { contains: q, mode: "insensitive" as const } },
          { author: { name: { contains: q, mode: "insensitive" as const } } },
          { author: { email: { contains: q, mode: "insensitive" as const } } },
          { blogPost: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [comments, totalMatching, totalComments] = await Promise.all([
    prisma.blogComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true, email: true } },
        blogPost: { select: { id: true, slug: true, title: true } },
      },
    }),
    prisma.blogComment.count({ where }),
    prisma.blogComment.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  function pageLink(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/kitchen/table-talk-comments?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/kitchen/table-talk" className="text-sm text-gray-500 hover:text-orange-600">
          ← Back to Table Talk
        </Link>
        <h1 className="text-2xl font-bold mt-1">Table Talk comments</h1>
        <p className="text-sm text-gray-500">{totalComments} comments total</p>
      </div>

      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="font-bold text-lg">
          {q ? `Search results for "${q}"` : "Recent comments"}
          <span className="text-gray-400 font-normal text-sm ml-2">
            ({totalMatching} {totalMatching === 1 ? "match" : "matches"})
          </span>
        </h2>
        <AdminSearch basePath="/kitchen/table-talk-comments" placeholder="Search by comment, author, or article..." />
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {comments.map((c) => (
          <AdminCommentRow
            key={c.id}
            comment={c as any}
            apiBase="/api/admin/blog-comments"
            parentHref={`/table-talk/${c.blogPost.slug}`}
            parentLabel={c.blogPost.title}
          />
        ))}
        {comments.length === 0 && (
          <p className="text-gray-400 text-sm p-4">
            {q ? "No comments match that search." : "No Table Talk comments posted yet."}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2 text-sm">
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
    </div>
  );
}
