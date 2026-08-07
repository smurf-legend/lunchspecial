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
      // text-gray-900 bg-white explicit, not inherited: this now only ever
      // renders inside the orange header (see LocationSearch), which sets
      // text-white for its nav links — same white-on-white bug the header's
      // search input already had a fix for, above.
      className="border rounded px-3 py-1.5 text-sm bg-white text-gray-900"
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
