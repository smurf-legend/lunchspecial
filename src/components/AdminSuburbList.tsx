"use client";
import { useMemo, useState } from "react";

type Suburb = { slug: string; name: string; postcode: string; region: string };

const REGION_ORDER = ["Central", "North", "East", "South", "West"];

export default function AdminSuburbList({ suburbs }: { suburbs: Suburb[] }) {
  const [query, setQuery] = useState("");
  const isFiltering = query.trim().length > 0;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? suburbs.filter((s) => s.name.toLowerCase().includes(q) || s.postcode.includes(q))
      : suburbs;

    const byRegion = new Map<string, Suburb[]>();
    for (const s of filtered) {
      const list = byRegion.get(s.region) ?? [];
      list.push(s);
      byRegion.set(s.region, list);
    }
    return REGION_ORDER.filter((r) => byRegion.has(r)).map((region) => ({
      region,
      suburbs: byRegion.get(region)!,
    }));
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
      <div className="flex flex-col gap-2 mb-4">
        {grouped.map(({ region, suburbs: regionSuburbs }) => (
          <details key={region} open={isFiltering} className="border rounded">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium bg-gray-50 rounded">
              {region}
              <span className="text-gray-400 font-normal ml-1.5">({regionSuburbs.length})</span>
            </summary>
            <div className="flex flex-wrap gap-2 p-3">
              {regionSuburbs.map((s) => (
                <span key={s.slug} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {s.name} ({s.postcode})
                </span>
              ))}
            </div>
          </details>
        ))}
        {grouped.length === 0 && (
          <p className="text-gray-400 text-sm">No suburbs match &quot;{query}&quot;.</p>
        )}
      </div>
    </div>
  );
}
