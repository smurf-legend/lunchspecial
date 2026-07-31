"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { specialSlug } from "@/lib/slugify";

type Suburb = { name: string; slug: string; postcode: string; state: string };
type SpecialSuggestion = { id: string; title: string; venueName: string };

export default function LocationSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [suburbMatches, setSuburbMatches] = useState<Suburb[]>([]);
  const [specialSuggestions, setSpecialSuggestions] = useState<SpecialSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Server-side suburb search rather than filtering a full client-side list
  // — with 17.5k suburbs seeded nationwide, shipping the whole table to the
  // browser just to filter it locally was a ~1.7MB payload on every visit.
  useEffect(() => {
    const q = location.trim();
    if (!q) {
      setSuburbMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setSuburbMatches(data.suburbs ?? []))
        .catch(() => setSuburbMatches([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [location]);

  // Keyword suggestions only matter once the typed text doesn't match a
  // known suburb/postcode — that case is already covered above.
  useEffect(() => {
    const q = location.trim();
    if (q.length < 2 || suburbMatches.length > 0) {
      setSpecialSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setSpecialSuggestions(data.specials ?? []))
        .catch(() => setSpecialSuggestions([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [location, suburbMatches.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(location);
  }

  function submit(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) params.set("location", trimmed);
    else params.delete("location");
    // A leftover suburb/state filter from earlier browsing (e.g. arriving
    // here from a suburb page) silently ANDs with the new keyword search,
    // which can produce zero results even when the keyword itself matches
    // something — the same text finds a real result via the dropdown
    // suggestions below only because those links go straight to the
    // special, bypassing filters entirely. Typing a new search is a fresh
    // query, not a refinement of whatever place was previously selected,
    // so it should replace that constraint rather than combine with it.
    params.delete("suburb");
    params.delete("state");
    setOpen(false);
    router.push(`/?${params.toString()}`);
  }

  function selectSuburb(suburb: Suburb) {
    setLocation(suburb.name);
    submit(suburb.name);
  }

  const showDropdown =
    open && location.trim().length > 0 && (suburbMatches.length > 0 || specialSuggestions.length > 0);

  return (
    <div className="relative mb-4">
      {/* Input gets its own full-width row on mobile (sm:flex-1 only kicks in
          once there's room to share a row with both buttons) — three items
          competing for one narrow row was squeezing the input down to
          barely a few characters wide. */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          maxLength={40}
          placeholder="Suburb, postcode, or keyword (e.g. Newtown, 2042, or banh mi)"
          className="border rounded px-3 py-2 w-full sm:flex-1 sm:min-w-0"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Solid orange used to work fine on the page's white background,
              but this component now only ever renders inside the orange
              header — same-color-on-same-color made the button invisible,
              just floating white text with no visible shape. Matched to the
              "Add a Special" button's white/bordered style so it actually
              reads as a button against the header. */}
          <button className="bg-white border-2 border-orange-600 text-orange-600 px-4 py-2 rounded font-medium hover:bg-orange-50 flex-1 sm:flex-none">
            Find
          </button>
          <Link
            href="/post"
            className="bg-white border-2 border-orange-600 text-orange-600 px-4 py-2 rounded font-medium hover:bg-orange-50 whitespace-nowrap flex-1 sm:flex-none text-center"
          >
            + Add a Special
          </Link>
        </div>
      </form>

      {showDropdown && (
        <div className="absolute z-10 top-full left-0 right-0 sm:right-auto sm:w-96 bg-white border rounded mt-1 shadow-md max-h-72 overflow-y-auto">
          {suburbMatches.length > 0
            ? suburbMatches.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onMouseDown={() => selectSuburb(s)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  📍 {s.name} <span className="text-gray-400">({s.postcode}, {s.state})</span>
                </button>
              ))
            : specialSuggestions.map((s) => (
                <Link
                  key={s.id}
                  href={`/specials/${specialSlug(s)}`}
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  🔍 {s.title} <span className="text-gray-400">— {s.venueName}</span>
                </Link>
              ))}
        </div>
      )}
    </div>
  );
}
