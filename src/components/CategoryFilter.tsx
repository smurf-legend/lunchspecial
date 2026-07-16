"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Category = { name: string; slug: string };

export default function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/?${params.toString()}`);
  }

  return (
    <select
      className="border rounded px-3 py-1.5 text-sm bg-white"
      value={searchParams.get("category") ?? ""}
      onChange={(e) => updateParam("category", e.target.value)}
    >
      <option value="">All cuisines</option>
      {categories.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
