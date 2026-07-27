"use client";
import { useEffect, useState } from "react";
import { AU_STATES } from "@/lib/auStates";

type Suburb = { name: string; slug: string; postcode: string; state: string };

// Search-and-add multi-select, shown as removable chips — same interaction
// pattern as SuburbAutocomplete's single-suburb search, just allowing more
// than one. Needed once a special (e.g. a chain deal at a few specific
// locations) can belong to many suburbs instead of just one.
//
// Searches server-side (debounced, /api/suburbs/search) rather than
// filtering a full suburb list client-side — see SuburbAutocomplete for why.
export default function SuburbPicker({
  selected,
  onChange,
}: {
  selected: Suburb[];
  onChange: (suburbs: Suburb[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Suburb[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPostcode, setNewPostcode] = useState("");
  const [newState, setNewState] = useState<string>(AU_STATES[0].code);
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const q = query.trim();
  const selectedSlugs = new Set(selected.map((s) => s.slug));

  useEffect(() => {
    if (!q) {
      setMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setMatches((data.suburbs ?? []).filter((s: Suburb) => !selectedSlugs.has(s.slug))))
        .catch(() => setMatches([]));
    }, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selected]);

  function addSuburb(suburb: Suburb) {
    onChange([...selected, suburb]);
    setQuery("");
  }

  function removeSlug(slug: string) {
    onChange(selected.filter((s) => s.slug !== slug));
  }

  async function handleAddSuburb() {
    setSubmitting(true);
    setAddError(null);

    const res = await fetch("/api/suburbs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query.trim(), postcode: newPostcode, state: newState }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error?.fieldErrors?.postcode?.[0] || "Failed to add suburb — check the postcode is 4 digits.");
      return;
    }

    const { suburb } = await res.json();
    addSuburb(suburb);
    setAdding(false);
    setNewPostcode("");
  }

  return (
    <div className="border rounded p-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((s) => (
            <span
              key={s.slug}
              className="flex items-center gap-1 bg-orange-50 text-orange-700 text-sm pl-2.5 pr-1.5 py-1 rounded-full"
            >
              {s.name}
              <button
                type="button"
                onClick={() => removeSlug(s.slug)}
                className="text-orange-400 hover:text-orange-900 font-bold px-1"
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by suburb name or postcode..."
          className="border rounded px-2 py-1.5 text-sm w-full"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAdding(false);
          }}
        />
        {matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded mt-1 shadow-md max-h-48 overflow-y-auto">
            {matches.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => addSuburb(s)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                {s.name} <span className="text-gray-400">({s.postcode}, {s.state})</span>
              </button>
            ))}
          </div>
        )}
        {q && matches.length === 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded mt-1 shadow-md p-3 text-sm">
            {!adding ? (
              <button type="button" onClick={() => setAdding(true)} className="text-orange-600 hover:underline">
                + Add "{query.trim()}" as a new suburb
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-gray-500">Adding "{query.trim()}"</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Postcode"
                    maxLength={4}
                    className="border rounded px-2 py-1 text-sm w-20"
                    value={newPostcode}
                    onChange={(e) => setNewPostcode(e.target.value)}
                  />
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  >
                    {AU_STATES.map(({ code }) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                {addError && <p className="text-red-600 text-xs">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddSuburb}
                    disabled={submitting || !newPostcode}
                    className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                  >
                    {submitting ? "Adding..." : "Add suburb"}
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="text-xs text-gray-500 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
