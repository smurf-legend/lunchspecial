"use client";
import { useMemo, useState } from "react";

type Suburb = { slug: string; name: string; postcode: string };

export default function AdminSuburbList({ suburbs }: { suburbs: Suburb[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? suburbs.filter((s) => s.name.toLowerCase().includes(q) || s.postcode.includes(q)) : suburbs;
  }, [suburbs, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search suburbs by name or postcode..."
        className="border rounded px-3 py-1.5 text-sm w-full mb-3"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="text-xs text-gray-400 mb-2">{filtered.length} suburbs</p>
      <div className="flex flex-wrap gap-2 mb-4 max-h-96 overflow-y-auto">
        {filtered.map((s) => (
          <span key={s.slug} className="text-xs bg-gray-100 px-2 py-1 rounded">
            {s.name} ({s.postcode})
          </span>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm">No suburbs match &quot;{query}&quot;.</p>}
      </div>
    </div>
  );
}
