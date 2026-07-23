"use client";
import { useEffect, useMemo, useState } from "react";
import { AU_STATES } from "@/lib/auStates";

type Suburb = { name: string; slug: string; postcode: string; region: string; state: string };

// Checkbox picker grouped by state then region, with a filter box — needed
// once a special (e.g. a nationwide chain deal) can belong to many suburbs
// instead of just one. Most posts still only pick a single suburb. Grouping
// by state first matters once more than one state has data, since region
// names like "Central" or "North" repeat across states.
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
  const [localSuburbs, setLocalSuburbs] = useState(suburbs);
  const [adding, setAdding] = useState(false);
  const [newPostcode, setNewPostcode] = useState("");
  const [newState, setNewState] = useState<string>(AU_STATES[0].code);
  const [newRegion, setNewRegion] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setLocalSuburbs(suburbs), [suburbs]);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? localSuburbs.filter((s) => s.name.toLowerCase().includes(q) || s.postcode.startsWith(q))
      : localSuburbs;
    const groups: Record<string, Record<string, Suburb[]>> = {};
    for (const s of filtered) {
      const byRegion = (groups[s.state] ??= {});
      (byRegion[s.region] ??= []).push(s);
    }
    return groups;
  }, [localSuburbs, filter]);

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  function toggleGroup(groupSlugs: string[]) {
    const allSelected = groupSlugs.every((s) => selected.includes(s));
    onChange(
      allSelected
        ? selected.filter((s) => !groupSlugs.includes(s))
        : [...new Set([...selected, ...groupSlugs])]
    );
  }

  async function handleAddSuburb() {
    setSubmitting(true);
    setAddError(null);

    const res = await fetch("/api/suburbs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: filter.trim(), postcode: newPostcode, state: newState, region: newRegion }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error?.fieldErrors?.postcode?.[0] || "Failed to add suburb — check the postcode is 4 digits.");
      return;
    }

    const { suburb } = await res.json();
    setLocalSuburbs((prev) => [...prev, suburb]);
    onChange([...selected, suburb.slug]);
    setFilter("");
    setAdding(false);
    setNewPostcode("");
    setNewRegion("");
  }

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <input
          type="text"
          placeholder="Filter by suburb name or postcode..."
          className="border rounded px-2 py-1 text-sm flex-1"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setAdding(false);
          }}
        />
        <span className="text-xs text-gray-500 shrink-0">{selected.length} selected</span>
      </div>
      <div className="max-h-64 overflow-y-auto flex flex-col gap-4">
        {Object.entries(grouped).map(([state, byRegion]) => (
          <div key={state}>
            <p className="text-xs font-bold text-gray-700 mb-1.5">{state}</p>
            <div className="flex flex-col gap-3 pl-2">
              {Object.entries(byRegion).map(([region, list]) => {
                const regionSlugs = list.map((s) => s.slug);
                const allSelected = regionSlugs.every((s) => selected.includes(s));
                return (
                  <div key={region}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">{region}</p>
                      <button
                        type="button"
                        onClick={() => toggleGroup(regionSlugs)}
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
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-sm">
            {!filter.trim() ? (
              <p className="text-gray-400">No suburbs yet.</p>
            ) : !adding ? (
              <p className="text-gray-400">
                No suburbs match "{filter}" —{" "}
                <button type="button" onClick={() => setAdding(true)} className="text-orange-600 hover:underline">
                  add it
                </button>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-gray-500">Adding "{filter.trim()}"</p>
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
