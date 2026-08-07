"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { specialSlug } from "@/lib/slugify";
import CategoryFilter from "@/components/CategoryFilter";
import PriceFilter from "@/components/PriceFilter";
import { PRICE_TIER_LABELS } from "@/lib/priceTiers";

type Suburb = { name: string; slug: string; postcode: string; state: string };
type SpecialSuggestion = { id: string; title: string; venueName: string };
type Category = { name: string; slug: string };

// Only auto-geolocate once per browser session, and only into a genuinely
// blank homepage visit — not on a suburb/category page or a search someone
// already typed, where silently overriding what they're looking at would
// be worse than not having the feature at all.
const GEO_SESSION_KEY = "lunchspecial:geo-attempted";

export default function LocationSearch({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  // The cuisine dropdown, price-tier pills, and reset link only make sense
  // as a filter on the results listing itself — every other page (a
  // special's detail page, Table Talk, etc.) still renders this component
  // for the location search box, just without the homepage-only filter row.
  const isHomePage = pathname === "/";
  const searchParams = useSearchParams();
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [suburbMatches, setSuburbMatches] = useState<Suburb[]>([]);
  const [specialSuggestions, setSpecialSuggestions] = useState<SpecialSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Auto "specials near me": fires once, silently, on a bare homepage
  // visit. Browsers show the permission prompt the instant
  // getCurrentPosition is called — there's no way to ask "automatically"
  // without that prompt appearing on load, so this only runs when there's
  // nothing else already narrowing the results, and never asks twice in
  // the same session (a denial or dismissal isn't retried on every visit).
  useEffect(() => {
    if (pathname !== "/") return;
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(GEO_SESSION_KEY)) return;

    const hasExplicitFilter = ["location", "suburb", "state", "category", "price", "greatValue"].some((k) =>
      searchParams.get(k)
    );
    if (hasExplicitFilter) return;

    sessionStorage.setItem(GEO_SESSION_KEY, "1");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch("/api/suburbs/nearest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        })
          .then((res) => res.json())
          .then((data) => {
            // Nearest-in-NSW is still "nearest" even from Melbourne or
            // Brisbane — cap how far that's allowed to be before it's more
            // misleading than useful. 50km covers greater Sydney plus a
            // reasonable regional commute; beyond that, silently stay on
            // the unfiltered homepage rather than dump someone in a random
            // NSW border town.
            if (data.suburb?.name && data.suburb.distanceKm <= 50) {
              setLocation(data.suburb.name);
              submit(data.suburb.name);
            }
          })
          .catch(() => {});
      },
      () => {}, // denied, unavailable, or timed out — stay on the default view
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
    // Deliberately runs once per mount, not on every searchParams change —
    // re-checking on each filter change would fight the user's own clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
      // state=NSW — every listing right now is NSW-only, so suggesting an
      // interstate suburb here just leads to an empty results page.
      fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}&state=NSW`)
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

  // Real Prisma query logic for these lives in page.tsx (which needs the
  // `where`/`rangeField` per tier) — this component only needs the label
  // text to render the pill links, via the shared PRICE_TIER_LABELS.
  const priceTier = searchParams.get("price") && PRICE_TIER_LABELS[searchParams.get("price")!]
    ? searchParams.get("price")!
    : undefined;
  const greatValueOnly = searchParams.get("greatValue") === "1";
  const hasActiveFilters = !!(
    searchParams.get("suburb") ||
    searchParams.get("category") ||
    searchParams.get("location") ||
    priceTier ||
    greatValueOnly ||
    searchParams.get("sort") ||
    searchParams.get("state")
  );

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
          // text-gray-900 bg-white explicitly, not inherited: this input
          // lives inside the orange header, which sets text-white for its
          // nav links — Tailwind's Preflight resets input color to inherit
          // rather than the browser's own default field text color, so
          // without this override the typed text was white-on-white,
          // invisible until you already knew it was there.
          className="border rounded px-3 py-2 w-full sm:flex-1 sm:min-w-0 text-gray-900 bg-white"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {isHomePage && (
          <div className="flex gap-2 items-center w-full sm:w-auto flex-wrap">
            <CategoryFilter categories={categories} />
            <PriceFilter />
            {hasActiveFilters && (
              <Link href="/" className="text-sm text-white underline decoration-white/60 hover:decoration-white whitespace-nowrap">
                ✕ Reset filters
              </Link>
            )}
          </div>
        )}
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
        // text-gray-900 for the same reason as the input above: this
        // dropdown is a descendant of the header's text-white, and neither
        // the suburb buttons nor the suggestion links set their own color
        // (only the secondary postcode/venue spans do, via text-gray-400),
        // so the primary text was inheriting white-on-white here too.
        <div className="absolute z-10 top-full left-0 right-0 sm:right-auto sm:w-96 bg-white border rounded mt-1 shadow-md max-h-72 overflow-y-auto text-gray-900">
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
