"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CommentRow = {
  id: string;
  body: string;
  hidden: boolean;
  createdAt: string | Date;
  author: { name: string | null; email: string };
  parentId: string | null;
};

export default function AdminCommentRow({
  comment,
  apiBase = "/api/admin/comments",
  parentHref,
  parentLabel,
}: {
  comment: CommentRow;
  // Which admin API this comment belongs to — Special comments vs Blog
  // comments are separate Prisma models with separate moderation endpoints.
  apiBase?: string;
  parentHref: string;
  parentLabel: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(comment.body);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  async function saveEdit() {
    if (!bodyDraft.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`${apiBase}/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyDraft }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function toggleHidden() {
    setLoading(true);
    setError(null);
    const res = await fetch(`${apiBase}/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !comment.hidden }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this comment and all its replies? This can't be undone.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`${apiBase}/${comment.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete");
      return;
    }
    setRemoved(true);
    router.refresh();
  }

  if (removed) return null;

  return (
    <div className="p-3 text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-gray-500 text-xs">
          <span className="font-medium text-gray-700">{comment.author.name}</span> ({comment.author.email})
          {" · "}
          <Link href={parentHref} className="text-orange-600 hover:underline">
            {parentLabel}
          </Link>
          {" · "}
          {new Date(comment.createdAt).toLocaleString()}
          {comment.parentId && <span> · reply</span>}
          {comment.hidden && (
            <span className="ml-1.5 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-medium">
              Hidden
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!editing && (
            <button
              disabled={loading}
              onClick={() => {
                setBodyDraft(comment.body);
                setEditing(true);
              }}
              className="text-gray-700 text-xs font-medium border rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Edit
            </button>
          )}
          <button
            disabled={loading}
            onClick={toggleHidden}
            className="text-gray-700 text-xs font-medium border rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
          >
            {comment.hidden ? "Unhide" : "Hide"}
          </button>
          <button
            disabled={loading}
            onClick={handleDelete}
            className="text-red-600 text-xs font-medium border border-red-200 rounded px-3 py-1 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 mt-2">
          <textarea
            className="border rounded px-3 py-2 text-sm"
            rows={3}
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
          />
          <div className="flex gap-2 self-end">
            <button
              disabled={loading}
              onClick={() => setEditing(false)}
              className="text-xs border rounded px-3 py-1.5 font-medium"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={saveEdit}
              className="text-xs bg-orange-600 text-white rounded px-3 py-1.5 font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-800 mt-1.5">{comment.body}</p>
      )}

      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
