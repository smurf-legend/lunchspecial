"use client";
import { useEffect, useState } from "react";
import { AU_STATES } from "@/lib/auStates";

type Suburb = { name: string; slug: string; postcode: string; state: string };

// Single-suburb search-select — used wherever we need one suburb tied to a
// person rather than a special (digest preference), as opposed to
// SuburbPicker's multi-select checkbox list for a special's locations.
// Matches on suburb name or postcode so a postcode can be typed directly
// instead of scrolling/searching for the name.
export default function SuburbAutocomplete({
  suburbs,
  value,
  onChange,
  placeholder = "Search by suburb name or postcode...",
  allowAdd = false,
}: {
  suburbs: Suburb[];
  value: string | null;
  onChange: (slug: string | null) => void;
  placeholder?: string;
  // Lets the user create a missing suburb inline (e.g. while posting a
  // special) rather than being stuck if it's not in the list yet.
  allowAdd?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [localSuburbs, setLocalSuburbs] = useState(suburbs);
  const [adding, setAdding] = useState(false);
  const [newPostcode, setNewPostcode] = useState("");
  const [newState, setNewState] = useState<string>(AU_STATES[0].code);
  const [newRegion, setNewRegion] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setLocalSuburbs(suburbs), [suburbs]);

  const selected = localSuburbs.find((s) => s.slug === value) ?? null;

  const q = query.trim().toLowerCase();
  const matches = q
    ? localSuburbs.filter((s) => s.name.toLowerCase().includes(q) || s.postcode.startsWith(q)).slice(0, 8)
    : [];

  async function handleAddSuburb() {
    setSubmitting(true);
    setAddError(null);

    const res = await fetch("/api/suburbs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query.trim(), postcode: newPostcode, state: newState, region: newRegion }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error?.fieldErrors?.postcode?.[0] || "Failed to add suburb — check the postcode is 4 digits.");
      return;
    }

    const { suburb } = await res.json();
    setLocalSuburbs((prev) => [...prev, suburb]);
    onChange(suburb.slug);
    setQuery("");
    setAdding(false);
    setNewPostcode("");
    setNewRegion("");
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-gray-50">
        <span className="text-sm">
          {selected.name} <span className="text-gray-400">({selected.postcode}, {selected.state})</span>
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
                onChange(s.slug);
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
                <input
                  type="text"
                  list="suburb-region-suggestions"
                  placeholder="Region, e.g. Inner West"
                  className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                />
                <datalist id="suburb-region-suggestions">
                  <option value="Central" />
                  <option value="North" />
                  <option value="East" />
                  <option value="South" />
                  <option value="West" />
                </datalist>
              </div>
              {addError && <p className="text-red-600 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddSuburb}
                  disabled={submitting || !newPostcode || !newRegion}
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
