"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function VoteButtons({
  voteEndpoint,
  initialScore,
  showCount = false,
}: {
  voteEndpoint: string;
  initialScore: number;
  // Voting itself stays fully functional either way — this only hides the
  // number, same reasoning as SpecialCard's showVoteCounts (see
  // lib/voteVisibility.ts). Votes still accumulate quietly in the
  // background so the score is real once counts are turned back on.
  showCount?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [loading, setLoading] = useState(false);
  // Which button to pop/float-feedback next, keyed by a fresh id each click
  // so clicking the same button twice in a row re-triggers the CSS
  // animation (a repeated key would otherwise no-op, since React sees no
  // prop change on the still-mounted element).
  const [pulse, setPulse] = useState<{ id: number; direction: 1 | -1 } | null>(null);

  // Backup to onAnimationEnd, not a replacement — a backgrounded tab pauses
  // CSS animations (confirmed while testing: a hidden document never fires
  // animationend), which would otherwise leave the pop/float stuck showing
  // until the next vote. 700ms comfortably outlasts the 600ms float
  // animation even when it does play normally.
  useEffect(() => {
    if (!pulse) return;
    const timeout = setTimeout(() => setPulse(null), 700);
    return () => clearTimeout(timeout);
  }, [pulse]);

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
      setPulse({ id: Date.now(), direction: value });
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <button
          disabled={loading}
          onClick={() => vote(1)}
          className={`text-2xl hover:scale-110 transition-transform disabled:opacity-50 ${
            pulse?.direction === 1 ? "animate-vote-pop" : ""
          }`}
          aria-label="Yummy"
          title="Yummy"
        >
          😋
        </button>
        {pulse?.direction === 1 && (
          <span
            key={pulse.id}
            onAnimationEnd={() => setPulse(null)}
            className="animate-vote-float absolute left-1/2 -top-1 text-sm font-bold text-green-600 pointer-events-none"
          >
            +1
          </span>
        )}
      </div>
      {showCount && <span className="font-bold text-lg">{score}</span>}
      <div className="relative">
        <button
          disabled={loading}
          onClick={() => vote(-1)}
          className={`text-2xl hover:scale-110 transition-transform disabled:opacity-50 ${
            pulse?.direction === -1 ? "animate-vote-pop" : ""
          }`}
          aria-label="Sick"
          title="Sick"
        >
          🤢
        </button>
        {pulse?.direction === -1 && (
          <span
            key={pulse.id}
            onAnimationEnd={() => setPulse(null)}
            className="animate-vote-float absolute left-1/2 -top-1 text-sm font-bold text-red-600 pointer-events-none"
          >
            −1
          </span>
        )}
      </div>
    </div>
  );
}
