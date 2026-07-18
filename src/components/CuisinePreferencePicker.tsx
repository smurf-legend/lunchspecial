"use client";

type Category = { name: string; slug: string };

// Optional multi-select for digest cuisine preference — unlike
// CategoryFilter (single-select, drives the homepage URL filter), this
// toggles any number of cuisines on/off for a person's own preference.
export default function CuisinePreferencePicker({
  categories,
  selected,
  onChange,
}: {
  categories: Category[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <button
          key={c.slug}
          type="button"
          onClick={() => toggle(c.slug)}
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            selected.includes(c.slug) ? "bg-orange-600 text-white" : "bg-white border text-gray-600"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
