"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isScheduled, formatScheduled } from "@/lib/postStatus";
import { blogPostSlug } from "@/lib/slugify";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  hidden: boolean;
  publishAt: string | Date | null;
  createdAt: string | Date;
  author: { name: string | null };
  score: number;
  _count: { comments: number };
};

export default function AdminBlogRow({ post }: { post: BlogPostRow }) {
  const scheduled = isScheduled(post.publishAt);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setRemoved(true);
      router.refresh();
    }
  }

  async function toggleHidden() {
    setTogglingHidden(true);
    const res = await fetch(`/api/admin/blog/${post.id}/hidden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !post.hidden }),
    });
    setTogglingHidden(false);
    if (res.ok) router.refresh();
  }

  if (removed) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 text-sm">
      <div>
        <Link href={`/table-talk/${blogPostSlug(post)}`} prefetch={false} className="font-medium hover:text-orange-600">
          {post.title}
        </Link>
        {post.hidden && (
          <span className="ml-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-medium">Hidden</span>
        )}
        {scheduled && (
          <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">
            Scheduled {formatScheduled(post.publishAt!)}
          </span>
        )}
        <p className="text-gray-500 text-xs">
          by {post.author.name} · {new Date(post.createdAt).toLocaleDateString()} · score {post.score} ·{" "}
          {post._count.comments} comments
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/kitchen/table-talk/${post.id}/edit`}
          prefetch={false}
          className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50"
        >
          Edit
        </Link>
        <button
          disabled={togglingHidden}
          onClick={toggleHidden}
          className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {togglingHidden ? "Saving..." : post.hidden ? "Unhide" : "Hide"}
        </button>
        <button
          disabled={deleting}
          onClick={handleDelete}
          className="text-red-600 text-xs font-medium border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
