"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string; _count: { specials: number } };

export default function AdminCategories({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add category");
      return;
    }

    setName("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete category");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((c) => (
          <span
            key={c.id}
            className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1.5"
          >
            {c.name} ({c._count.specials})
            <button
              type="button"
              onClick={() => handleDelete(c.id)}
              disabled={deletingId === c.id}
              title={c._count.specials > 0 ? "Only unused categories can be deleted" : "Delete"}
              className="text-gray-400 hover:text-red-600 disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">New cuisine/category name</label>
          <input
            type="text"
            required
            placeholder="e.g. Filipino"
            className="border rounded px-2 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          disabled={loading}
          className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add category"}
        </button>
        {error && <p className="text-red-600 text-xs w-full">{error}</p>}
      </form>
    </div>
  );
}
