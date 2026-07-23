"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isExpired } from "@/lib/dealStatus";
import { specialSlug } from "@/lib/slugify";

type Special = {
  id: string;
  title: string;
  venueName: string;
  score: number;
  createdAt: string;
  expiresAt: string | Date | null;
  hidden: boolean;
  needsReview: boolean;
  author: { name: string | null; email: string };
  suburbs: { suburb: { name: string } }[];
  chainWide: boolean;
  _count: { comments: number };
};

export default function AdminSpecialRow({ special }: { special: Special }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [togglingReview, setTogglingReview] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${special.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/specials/${special.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setRemoved(true);
      router.refresh();
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/admin/specials/${special.id}/duplicate`, { method: "POST" });
    setDuplicating(false);
    if (res.ok) {
      const { special: copy } = await res.json();
      router.push(`/kitchen/specials/${copy.id}/edit`);
    }
  }

  async function toggleHidden() {
    setTogglingHidden(true);
    const res = await fetch(`/api/admin/specials/${special.id}/hidden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !special.hidden }),
    });
    setTogglingHidden(false);
    if (res.ok) router.refresh();
  }

  async function toggleNeedsReview() {
    const note = special.needsReview
      ? undefined
      : prompt("Why does this need review? (shown on the Needs Review page)") ?? undefined;
    if (!special.needsReview && note === undefined) return; // cancelled the prompt
    setTogglingReview(true);
    const res = await fetch(`/api/admin/specials/${special.id}/needs-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsReview: !special.needsReview, needsReviewNote: note }),
    });
    setTogglingReview(false);
    if (res.ok) router.refresh();
  }

  if (removed) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 text-sm">
      <div>
        <Link href={`/specials/${specialSlug(special)}`} prefetch={false} className="font-medium hover:text-orange-600">
          {special.title}
        </Link>
        {special.hidden && (
          <span className="ml-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-medium">
            Hidden
          </span>
        )}
        {isExpired(special.expiresAt) && (
          <span className="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-medium">
            Expired
          </span>
        )}
        {special.needsReview && (
          <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">
            Needs review
          </span>
        )}
        <p className="text-gray-500 text-xs">
          {special.venueName} ·{" "}
          {special.chainWide
            ? "All Stores"
            : special.suburbs.length > 1
            ? `${special.suburbs[0].suburb.name} +${special.suburbs.length - 1} more`
            : special.suburbs[0]?.suburb.name}{" "}
          · by {special.author.name} ({special.author.email}) · score {special.score} ·{" "}
          {special._count.comments} comments
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/kitchen/specials/${special.id}/edit`}
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
          {togglingHidden ? "Saving..." : special.hidden ? "Unhide" : "Hide"}
        </button>
        <button
          disabled={togglingReview}
          onClick={toggleNeedsReview}
          title="Flag when you can't confirm this special is accurate — surfaces it on /kitchen/needs-review"
          className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {togglingReview ? "Saving..." : special.needsReview ? "Clear review flag" : "Flag for review"}
        </button>
        <button
          disabled={duplicating}
          onClick={handleDuplicate}
          title="Copy this special's venue/price/image into a new post — handy for same-venue, different-day specials"
          className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {duplicating ? "Duplicating..." : "Duplicate"}
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
