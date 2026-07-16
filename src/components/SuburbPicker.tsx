"use client";
import { useMemo, useState } from "react";

type Suburb = { name: string; slug: string; region: string };

// Checkbox picker grouped by region, with a filter box — needed once a
// special (e.g. a nationwide chain deal) can belong to many suburbs
// instead of just one. Most posts still only pick a single suburb.
export default function SuburbPicker({
  suburbs,
  selected,
  onChange,
}: {
  suburbs: Suburb[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? suburbs.filter((s) => s.name.toLowerCase().includes(q)) : suburbs;
    const groups: Record<string, Suburb[]> = {};
    for (const s of filtered) {
      (groups[s.region] ??= []).push(s);
    }
    return groups;
  }, [suburbs, filter]);

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  function toggleRegion(regionSlugs: string[]) {
    const allSelected = regionSlugs.every((s) => selected.includes(s));
    onChange(
      allSelected
        ? selected.filter((s) => !regionSlugs.includes(s))
        : [...new Set([...selected, ...regionSlugs])]
    );
  }

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <input
          type="text"
          placeholder="Filter suburbs..."
          className="border rounded px-2 py-1 text-sm flex-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="text-xs text-gray-500 shrink-0">{selected.length} selected</span>
      </div>
      <div className="max-h-64 overflow-y-auto flex flex-col gap-3">
        {Object.entries(grouped).map(([region, list]) => {
          const regionSlugs = list.map((s) => s.slug);
          const allSelected = regionSlugs.every((s) => selected.includes(s));
          return (
            <div key={region}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">{region}</p>
                <button
                  type="button"
                  onClick={() => toggleRegion(regionSlugs)}
                  className="text-xs text-orange-600 hover:underline"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {list.map((s) => (
                  <label key={s.slug} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.slug)}
                      onChange={() => toggle(s.slug)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-gray-400">No suburbs match "{filter}"</p>
        )}
      </div>
    </div>
  );
}
