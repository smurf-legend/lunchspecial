"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSpecialButton({
  specialId,
  title,
  apiBase = "/api/admin/specials",
}: {
  specialId: string;
  title: string;
  apiBase?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`${apiBase}/${specialId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      return;
    }
    setDeleting(false);
  }

  return (
    <button
      disabled={deleting}
      onClick={handleDelete}
      className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-red-600 text-white border-red-600 disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "🗑️ Delete"}
    </button>
  );
}
