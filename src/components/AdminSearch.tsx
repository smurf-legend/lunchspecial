"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminSearch({
  basePath = "/admin",
  placeholder = "Search by title, venue, or suburb...",
}: {
  basePath?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page"); // reset to page 1 on a new search
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder={placeholder}
        className="border rounded px-3 py-1.5 text-sm flex-1"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="bg-orange-600 text-white px-4 py-1.5 rounded text-sm font-medium">
        Search
      </button>
    </form>
  );
}
