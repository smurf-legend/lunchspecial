import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";
import CommentThread from "@/components/CommentThread";
import SpecialImage from "@/components/SpecialImage";
import ArticleBody from "@/components/ArticleBody";
import { buildCommentTree } from "@/lib/commentTree";
import { isScheduled, formatScheduled } from "@/lib/postStatus";

const authorSelect = {
  select: {
    name: true,
    _count: { select: { specials: true, comments: true } },
  },
};

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "admin";

  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    include: { author: { select: { name: true } } },
  });

  if (!post) notFound();
  const scheduled = isScheduled(post.publishAt);
  // Hidden or not-yet-scheduled posts 404 for everyone except admins, same
  // as hidden specials.
  if ((post.hidden || scheduled) && !isAdmin) notFound();

  const flatComments = await prisma.blogComment.findMany({
    where: { blogPostId: post.id },
    include: { author: authorSelect },
    orderBy: { createdAt: "asc" },
  });
  const commentTree = buildCommentTree(flatComments);

  return (
    <div className="flex flex-col gap-6">
      {(post.hidden || scheduled) && isAdmin && (
        <div className="bg-gray-800 text-white rounded-lg px-4 py-3 text-sm font-medium">
          {scheduled
            ? `This article is scheduled to publish on ${formatScheduled(post.publishAt!)} — only admins can see it until then.`
            : "This article is hidden — only admins can see it."}{" "}
          <Link href={`/kitchen/table-talk/${post.id}/edit`} className="underline">
            Manage
          </Link>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 flex gap-5">
        <VoteButtons voteEndpoint={`/api/blog/${post.id}/vote`} initialScore={post.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{post.title}</h1>
            {isAdmin && (
              <Link
                href={`/kitchen/table-talk/${post.id}/edit`}
                className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-gray-800 text-white border-gray-800"
              >
                ✏️ Edit
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            By {post.author.name} · {new Date(post.publishAt ?? post.createdAt).toLocaleDateString()}
          </p>

          <SpecialImage
            src={post.imageUrl}
            alt={post.title}
            className={
              post.imageUrl
                ? "mt-4 w-full max-h-[500px] object-contain rounded-lg border bg-gray-50"
                : "mt-4 h-64 w-full rounded-lg border"
            }
            iconClassName="text-5xl"
          />

          <div className="mt-4">
            <ArticleBody body={post.body} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <CommentThread
          commentsEndpoint={`/api/blog/${post.id}/comments`}
          reactEndpointBase="/api/blog-comments"
          comments={commentTree as any}
        />
      </div>
    </div>
  );
}
