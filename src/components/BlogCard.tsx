import Link from "next/link";
import SpecialImage from "@/components/SpecialImage";
import { blogPostSlug } from "@/lib/slugify";

type BlogPostCardType = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  createdAt: string | Date;
  publishAt?: string | Date | null;
  upvoteCount: number;
  downvoteCount: number;
  hidden?: boolean;
  author: { name: string | null };
  _count?: { comments: number };
};

export default function BlogCard({
  post,
  showVoteCounts = false,
}: {
  post: BlogPostCardType;
  // Defaults to hidden — see shouldShowVoteCounts in lib/voteVisibility.ts.
  showVoteCounts?: boolean;
}) {
  return (
    <div className="flex gap-4 bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
      {showVoteCounts && (
        <div className="flex flex-col items-center w-14 shrink-0 gap-1">
          <span className="flex items-center gap-1">
            <span aria-hidden="true">😋</span>
            <span className="font-bold text-green-600">{post.upvoteCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true">🤢</span>
            <span className="font-bold text-red-600">{post.downvoteCount}</span>
          </span>
        </div>
      )}

      <SpecialImage
        src={post.imageUrl}
        alt={post.title}
        className="w-20 h-20 object-cover rounded shrink-0"
        iconClassName="text-2xl"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/table-talk/${blogPostSlug(post)}`}
            prefetch={false}
            className="font-semibold text-lg hover:text-orange-600"
          >
            {post.title}
          </Link>
          {post.hidden && (
            <span className="bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-medium">Hidden</span>
          )}
        </div>
        {post.excerpt && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.excerpt}</p>}
        <p className="text-xs text-gray-400 mt-2">
          By {post.author.name} · {new Date(post.publishAt ?? post.createdAt).toLocaleDateString()} · 💬{" "}
          {post._count?.comments ?? 0}
        </p>
      </div>
    </div>
  );
}
