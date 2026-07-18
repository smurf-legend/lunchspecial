"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DuplicateSpecialButton({ specialId }: { specialId: string }) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/admin/specials/${specialId}/duplicate`, { method: "POST" });
    if (res.ok) {
      const { special } = await res.json();
      router.push(`/kitchen/specials/${special.id}/edit`);
      return;
    }
    setDuplicating(false);
  }

  return (
    <button
      disabled={duplicating}
      onClick={handleDuplicate}
      title="Copy this special's venue/price/image into a new post — handy for same-venue, different-day specials"
      className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-gray-800 text-white border-gray-800 disabled:opacity-50"
    >
      {duplicating ? "Duplicating..." : "📋 Duplicate"}
    </button>
  );
}
