"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    // A keyword search is a fresh, city-wide search — drop any suburb filter
    // left over from LocationSearch so it doesn't silently narrow results.
    params.delete("location");
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Search by keyword..."
        className="border rounded px-3 py-1.5 text-sm w-48"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="bg-white border px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-50">
        Search
      </button>
    </form>
  );
}
