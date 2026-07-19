"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearReviewButton({ specialId }: { specialId: string }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    const res = await fetch(`/api/admin/specials/${specialId}/needs-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsReview: false }),
    });
    setClearing(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      disabled={clearing}
      onClick={handleClear}
      title="Mark as resolved — removes it from this list"
      className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 shrink-0"
    >
      {clearing ? "Clearing..." : "Mark resolved"}
    </button>
  );
}
