import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminBlogRow from "@/components/AdminBlogRow";

export default async function AdminBlogPage() {
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

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-orange-600">
          ← Back to admin
        </Link>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Table Talk</h1>
            <p className="text-sm text-gray-500">
              {posts.length} article{posts.length === 1 ? "" : "s"} ·{" "}
              <Link href="/admin/table-talk-comments" className="text-orange-600 hover:underline">
                Table Talk comments
              </Link>
            </p>
          </div>
          <Link
            href="/admin/table-talk/new"
            className="bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-orange-700"
          >
            Write a new article
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {posts.map((post) => (
          <AdminBlogRow key={post.id} post={post as any} />
        ))}
        {posts.length === 0 && (
          <p className="text-gray-400 text-sm p-4">
            No articles yet —{" "}
            <Link href="/admin/table-talk/new" className="text-orange-600 underline">
              write the first one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
