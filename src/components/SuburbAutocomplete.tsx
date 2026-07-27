"use client";
import { useEffect, useState } from "react";
import { AU_STATES } from "@/lib/auStates";

type Suburb = { name: string; slug: string; postcode: string; state: string };

// Single-suburb search-select — used wherever we need one suburb tied to a
// person rather than a special (digest preference), as opposed to
// SuburbPicker's multi-select checkbox list for a special's locations.
// Matches on suburb name or postcode so a postcode can be typed directly
// instead of scrolling/searching for the name.
//
// Searches server-side (debounced, /api/suburbs/search) rather than
// filtering a full suburb list client-side — with 17.5k suburbs seeded
// nationwide, shipping the whole table to the browser just to filter it
// locally was a ~1.7MB payload on every page that used this component.
export default function SuburbAutocomplete({
  value,
  onChange,
  placeholder = "Search by suburb name or postcode...",
  allowAdd = false,
}: {
  value: Suburb | null;
  onChange: (suburb: Suburb | null) => void;
  placeholder?: string;
  // Lets the user create a missing suburb inline (e.g. while posting a
  // special) rather than being stuck if it's not in the list yet.
  allowAdd?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Suburb[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPostcode, setNewPostcode] = useState("");
  const [newState, setNewState] = useState<string>(AU_STATES[0].code);
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const q = query.trim();

  useEffect(() => {
    if (!q) {
      setMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setMatches(data.suburbs ?? []))
        .catch(() => setMatches([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [q]);

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
    onChange(suburb);
    setQuery("");
    setAdding(false);
    setNewPostcode("");
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-gray-50">
        <span className="text-sm">
          {value.name} <span className="text-gray-400">({value.postcode}, {value.state})</span>
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
              onClick={() => {
                onChange(s);
                setQuery("");
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {s.name} <span className="text-gray-400">({s.postcode}, {s.state})</span>
            </button>
          ))}
        </div>
      )}
      {q && matches.length === 0 && !allowAdd && (
        <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded mt-1 shadow-md px-3 py-2 text-sm text-gray-400">
          No suburbs match "{query}"
        </div>
      )}
      {q && matches.length === 0 && allowAdd && (
        <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded mt-1 shadow-md p-3 text-sm">
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-orange-600 hover:underline"
            >
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
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
