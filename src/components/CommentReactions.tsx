"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CommentReactions({
  reactEndpoint,
  initialLikeCount,
  initialDislikeCount,
}: {
  reactEndpoint: string;
  initialLikeCount: number;
  initialDislikeCount: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [loading, setLoading] = useState(false);

  async function react(value: 1 | -1) {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await fetch(reactEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.likeCount);
      setDislikeCount(data.dislikeCount);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        disabled={loading}
        onClick={() => react(1)}
        className="hover:scale-110 transition-transform disabled:opacity-50"
        aria-label="Yummy"
        title="Yummy"
      >
        😋 {likeCount}
      </button>
      <button
        disabled={loading}
        onClick={() => react(-1)}
        className="hover:scale-110 transition-transform disabled:opacity-50"
        aria-label="Yuck"
        title="Yuck"
      >
        🤢 {dislikeCount}
      </button>
    </div>
  );
}
