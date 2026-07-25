import { cache } from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";
import CommentThread from "@/components/CommentThread";
import SpecialImage from "@/components/SpecialImage";
import ArticleBody from "@/components/ArticleBody";
import ShareButton from "@/components/ShareButton";
import { buildCommentTree } from "@/lib/commentTree";
import { isScheduled, formatScheduled } from "@/lib/postStatus";
import { blogPostSlug, idFromSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";
import { buildBlogPostingJsonLd, safeJsonLd } from "@/lib/structuredData";

const authorSelect = {
  select: {
    name: true,
    _count: { select: { specials: true, comments: true } },
  },
};

// Shared between generateMetadata and the page body so the two don't issue
// duplicate queries for the same post within one request.
const getPost = cache(async (slugParam: string) => {
  const id = idFromSlug(slugParam);
  let post = await prisma.blogPost.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  // Links published before this id-based scheme are a plain slugified
  // title with no id suffix — idFromSlug on those just grabs the last
  // word, which won't match a real id, so fall back to the legacy column.
  if (!post) {
    post = await prisma.blogPost.findUnique({
      where: { slug: slugParam },
      include: { author: { select: { name: true } } },
    });
  }
  return post;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post || post.hidden || isScheduled(post.publishAt)) return {};

  const title = `${post.title} | LunchSpecial Table Talk`;
  const description = (post.excerpt || post.body).slice(0, 155);
  const canonical = `/table-talk/${blogPostSlug(post)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "LunchSpecial",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "admin";

  const post = await getPost(params.slug);

  if (!post) notFound();
  const scheduled = isScheduled(post.publishAt);
  // Hidden or not-yet-scheduled posts 404 for everyone except admins, same
  // as hidden specials.
  if ((post.hidden || scheduled) && !isAdmin) notFound();

  // Send legacy links and stale slugs (e.g. after a title edit) to the
  // current canonical URL, so there's only ever one indexable address per
  // article — same scheme as Special.
  const canonical = blogPostSlug(post);
  if (params.slug !== canonical) redirect(`/table-talk/${canonical}`);

  const flatComments = await prisma.blogComment.findMany({
    where: { blogPostId: post.id },
    include: { author: authorSelect },
    orderBy: { createdAt: "asc" },
  });
  const commentTree = buildCommentTree(flatComments);

  const blogPostingJsonLd = buildBlogPostingJsonLd({
    url: `${SITE_URL}/table-talk/${canonical}`,
    title: post.title,
    description: (post.excerpt || post.body).slice(0, 155),
    imageUrl: post.imageUrl,
    authorName: post.author.name ?? "LunchSpecial Team",
    datePublished: post.publishAt ?? post.createdAt,
    dateModified: post.updatedAt,
  });

  return (
    <div className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(blogPostingJsonLd) }} />

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
            <ShareButton url={`${SITE_URL}/table-talk/${canonical}`} title={post.title} />
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
