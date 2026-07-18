"use client";
import { useMemo, useState } from "react";
import { AU_STATE_CODES, stateName } from "@/lib/auStates";

type Suburb = { slug: string; name: string; postcode: string; region: string; state: string };

export default function AdminSuburbList({ suburbs }: { suburbs: Suburb[] }) {
  const [query, setQuery] = useState("");
  const isFiltering = query.trim().length > 0;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? suburbs.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.postcode.includes(q) ||
            s.state.toLowerCase().includes(q)
        )
      : suburbs;

    const byState = new Map<string, Map<string, Suburb[]>>();
    for (const s of filtered) {
      const byRegion = byState.get(s.state) ?? new Map<string, Suburb[]>();
      const list = byRegion.get(s.region) ?? [];
      list.push(s);
      byRegion.set(s.region, list);
      byState.set(s.state, byRegion);
    }

    // Known states first (in our canonical order), then any others
    // (shouldn't happen, but don't silently drop data if it does).
    const orderedStates = [
      ...AU_STATE_CODES.filter((s) => byState.has(s)),
      ...[...byState.keys()].filter((s) => !(AU_STATE_CODES as readonly string[]).includes(s)),
    ];

    return orderedStates.map((state) => ({
      state,
      total: [...byState.get(state)!.values()].reduce((sum, list) => sum + list.length, 0),
      regions: [...byState.get(state)!.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    }));
  }, [suburbs, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search suburbs by name, postcode, or state..."
        className="border rounded px-3 py-1.5 text-sm w-full mb-3"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex flex-col gap-2 mb-4">
        {grouped.map(({ state, total, regions }) => (
          <details key={state} open={isFiltering} className="border rounded">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium bg-gray-50 rounded">
              {stateName(state)} ({state})
              <span className="text-gray-400 font-normal ml-1.5">({total})</span>
            </summary>
            <div className="flex flex-col gap-2 p-3">
              {regions.map(([region, regionSuburbs]) => (
                <div key={region}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {region} <span className="text-gray-400 font-normal">({regionSuburbs.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {regionSuburbs.map((s) => (
                      <span key={s.slug} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {s.name} ({s.postcode})
                      </span>
                    ))}
                  </div>
                </div>
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
