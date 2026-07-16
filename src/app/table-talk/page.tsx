import { prisma } from "@/lib/prisma";
import BlogCard from "@/components/BlogCard";

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { hidden: false },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });

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
