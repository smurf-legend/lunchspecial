"use client";
import { useMemo, useState } from "react";

type Suburb = { name: string; slug: string; state: string };

// Single-suburb search-select — used wherever we need one suburb tied to a
// person rather than a special (digest preference), as opposed to
// SuburbPicker's multi-select checkbox list for a special's locations.
export default function SuburbAutocomplete({
  suburbs,
  value,
  onChange,
  placeholder = "Search for your suburb...",
}: {
  suburbs: Suburb[];
  value: string | null;
  onChange: (slug: string | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const selected = useMemo(() => suburbs.find((s) => s.slug === value) ?? null, [suburbs, value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return suburbs.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [suburbs, query]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-gray-50">
        <span className="text-sm">
          {selected.name} <span className="text-gray-400">({selected.state})</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-auto text-xs text-orange-600 hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className="border rounded px-3 py-2 w-full text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {matches.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded mt-1 shadow-md max-h-48 overflow-y-auto">
          {matches.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => {
                onChange(s.slug);
                setQuery("");
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {s.name} <span className="text-gray-400">({s.state})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
