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
  author: { name: string | null; email: string };
  suburbs: { suburb: { name: string } }[];
  chainWide: boolean;
  _count: { comments: number };
};

export default function AdminSpecialRow({ special }: { special: Special }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
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

  if (removed) return null;

  return (
    <div className="flex items-center justify-between p-3 text-sm">
      <div>
        <Link href={`/specials/${specialSlug(special)}`} className="font-medium hover:text-orange-600">
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
        <p className="text-gray-500 text-xs">
          {special.venueName} ·{" "}
          {special.chainWide
            ? "All Sydney locations"
            : special.suburbs.length > 1
            ? `${special.suburbs[0].suburb.name} +${special.suburbs.length - 1} more`
            : special.suburbs[0]?.suburb.name}{" "}
          · by {special.author.name} ({special.author.email}) · score {special.score} ·{" "}
          {special._count.comments} comments
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/kitchen/specials/${special.id}/edit`}
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
