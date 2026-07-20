"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ContributorBadge from "@/components/ContributorBadge";
import CommentReactions from "@/components/CommentReactions";

export type CommentNodeType = {
  id: string;
  body: string;
  createdAt: string;
  hidden: boolean;
  likeCount: number;
  dislikeCount: number;
  author: { name: string | null; _count?: { specials: number; comments: number } };
  replies: CommentNodeType[];
};

export default function CommentItem({
  comment,
  commentsEndpoint,
  reactEndpointBase,
}: {
  comment: CommentNodeType;
  // Where to POST a new reply, e.g. `/api/specials/${id}/comments` or
  // `/api/blog/${id}/comments`.
  commentsEndpoint: string;
  // Prefix for a comment's react endpoint, e.g. `/api/comments` or
  // `/api/blog-comments` — `/${comment.id}/react` is appended per comment.
  reactEndpointBase: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReply() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!replyBody.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(commentsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody, parentId: comment.id }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      setReplyBody("");
      setReplyOpen(false);
    } else {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || "Failed to post reply");
    }
  }

  return (
    <div className="border-l-2 border-gray-200 pl-3">
      <p className="text-sm flex items-center gap-1.5 flex-wrap">
        <span className="font-medium">{comment.author.name}</span>
        {comment.author._count && (
          <ContributorBadge specials={comment.author._count.specials} comments={comment.author._count.comments} />
        )}
        <span className="text-gray-400 text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
      </p>
      {comment.hidden ? (
        <p className="text-gray-400 italic mt-1">[Comment removed by moderator]</p>
      ) : (
        <p className="text-gray-800 mt-1">{comment.body}</p>
      )}

      <div className="flex items-center gap-3 mt-1">
        {!comment.hidden && (
          <CommentReactions
            reactEndpoint={`${reactEndpointBase}/${comment.id}/react`}
            initialLikeCount={comment.likeCount}
            initialDislikeCount={comment.dislikeCount}
          />
        )}
        <button className="text-xs text-orange-600" onClick={() => setReplyOpen((o) => !o)}>
          Reply
        </button>
      </div>

      {replyOpen && (
        <div className="flex flex-col gap-2 mt-2">
          <textarea
            className="border rounded px-3 py-2 text-sm"
            rows={2}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            disabled={loading}
            onClick={submitReply}
            className="self-end bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="flex flex-col gap-3 mt-3 ml-3">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              commentsEndpoint={commentsEndpoint}
              reactEndpointBase={reactEndpointBase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
