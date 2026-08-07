"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { PRICE_TIER_LABELS } from "@/lib/priceTiers";

// Everyday Value and the price tiers used to be five-plus separate pill
// links — fine on desktop, but on mobile they wrapped into two or three
// extra rows under the search bar. Rolled into one dropdown (same pattern
// as CategoryFilter) since a visitor only ever wants one price constraint
// at a time in practice; "greatValue" and "price" are still two separate
// query params under the hood; this just presents them as one mutually
// exclusive choice rather than two independently-togglable pills.
const GREAT_VALUE = "great-value";

export default function PriceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const priceTier = searchParams.get("price") && PRICE_TIER_LABELS[searchParams.get("price")!]
    ? searchParams.get("price")!
    : "";
  const greatValueOnly = searchParams.get("greatValue") === "1";
  const value = greatValueOnly ? GREAT_VALUE : priceTier;

  function updateParam(selected: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // changing a filter should land back on page 1
    params.delete("price");
    params.delete("greatValue");
    if (selected === GREAT_VALUE) params.set("greatValue", "1");
    else if (selected) params.set("price", selected);
    router.push(`/?${params.toString()}`);
  }

  return (
    <select
      // text-gray-900 bg-white explicit for the same reason as
      // CategoryFilter — this renders inside the orange header.
      className="border rounded px-3 py-1.5 text-sm bg-white text-gray-900"
      value={value}
      onChange={(e) => updateParam(e.target.value)}
    >
      <option value="">Any price</option>
      <option value={GREAT_VALUE}>💎 Everyday Value</option>
      {Object.entries(PRICE_TIER_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
