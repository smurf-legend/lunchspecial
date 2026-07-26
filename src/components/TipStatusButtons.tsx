"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TipStatusButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "posted" | "dismissed") {
    setBusy(true);
    const res = await fetch(`/api/admin/tips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        disabled={busy}
        onClick={() => setStatus("posted")}
        title="I've turned this into a real Special"
        className="bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-orange-700 disabled:opacity-50 shrink-0"
      >
        Mark posted
      </button>
      <button
        disabled={busy}
        onClick={() => setStatus("dismissed")}
        title="Not worth posting"
        className="text-gray-700 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
