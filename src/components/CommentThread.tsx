"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CommentItem, { CommentNodeType } from "@/components/CommentItem";
import { countComments } from "@/lib/commentTree";

export default function CommentThread({
  commentsEndpoint,
  reactEndpointBase,
  comments,
}: {
  // Where to POST a new top-level comment, e.g. `/api/specials/${id}/comments`
  // or `/api/blog/${id}/comments`.
  commentsEndpoint: string;
  // Prefix for a comment's react endpoint — see CommentItem.
  reactEndpointBase: string;
  comments: CommentNodeType[];
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function postTopLevel() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!newComment.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(commentsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      setNewComment("");
    } else {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || "Failed to post comment");
    }
  }

  return (
    <div>
      <h2 className="font-bold text-lg mb-3">Comments ({countComments(comments)})</h2>

      <div className="flex flex-col gap-2 mb-6">
        <textarea
          className="border rounded px-3 py-2"
          rows={3}
          placeholder={session ? "Add a comment..." : "Log in to comment"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={loading}
          onClick={postTopLevel}
          className="self-end bg-orange-600 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
        >
          Post comment
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            commentsEndpoint={commentsEndpoint}
            reactEndpointBase={reactEndpointBase}
          />
        ))}
        {comments.length === 0 && (
          <p className="text-gray-400 text-sm">No comments yet — start the discussion.</p>
        )}
      </div>
    </div>
  );
}
