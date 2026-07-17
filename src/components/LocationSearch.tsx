"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LocationSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState(searchParams.get("location") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = location.trim();
    if (trimmed) params.set("location", trimmed);
    else params.delete("location");
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
      <input
        type="text"
        maxLength={40}
        placeholder="Suburb or postcode (e.g. Newtown or 2042)"
        className="border rounded px-3 py-2 flex-1 min-w-0"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <button className="bg-orange-600 text-white px-4 py-2 rounded font-medium">Find</button>
      <Link
        href="/specials/new"
        className="bg-white border-2 border-orange-600 text-orange-600 px-4 py-2 rounded font-medium hover:bg-orange-50 whitespace-nowrap"
      >
        + Post a Special
      </Link>
    </form>
  );
}
