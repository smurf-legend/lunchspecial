"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function VoteButtons({
  voteEndpoint,
  initialScore,
}: {
  voteEndpoint: string;
  initialScore: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [loading, setLoading] = useState(false);

  async function vote(value: 1 | -1) {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await fetch(voteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setScore(data.score);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        disabled={loading}
        onClick={() => vote(1)}
        className="text-2xl hover:scale-110 transition-transform disabled:opacity-50"
        aria-label="Yummy"
        title="Yummy"
      >
        😋
      </button>
      <span className="font-bold text-lg">{score}</span>
      <button
        disabled={loading}
        onClick={() => vote(-1)}
        className="text-2xl hover:scale-110 transition-transform disabled:opacity-50"
        aria-label="Sick"
        title="Sick"
      >
        🤢
      </button>
    </div>
  );
}
