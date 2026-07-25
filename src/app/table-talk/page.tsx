import { prisma } from "@/lib/prisma";
import BlogCard from "@/components/BlogCard";

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { hidden: false, OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });
  // Sort by when a post actually went live, not when the row was created —
  // otherwise a post scheduled for next week sorts as if it were written
  // today the moment it finally appears. publishAt is null on posts
  // published the old way (pre-scheduling), where createdAt is correct.
  posts.sort(
    (a, b) =>
      new Date(b.publishAt ?? b.createdAt).getTime() - new Date(a.publishAt ?? a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Table Talk</h1>
        <p className="text-sm text-gray-500">Articles, opinions, and news from the LunchSpecial team.</p>
      </div>

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post as any} />
        ))}
        {posts.length === 0 && (
          <p className="text-gray-500 text-center py-12">No articles yet — check back soon.</p>
        )}
      </div>
    </div>
  );
}
