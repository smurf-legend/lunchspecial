"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAddSuburb() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", postcode: "", state: "NSW" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/suburbs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to add suburb — check postcode is 4 digits.");
      return;
    }

    setForm({ name: "", postcode: "", state: form.state });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Suburb name</label>
        <input
          type="text"
          required
          className="border rounded px-2 py-1.5 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Postcode</label>
        <input
          type="text"
          required
          maxLength={4}
          className="border rounded px-2 py-1.5 text-sm w-20"
          value={form.postcode}
          onChange={(e) => setForm({ ...form, postcode: e.target.value })}
        />
      </div>
      <button
        disabled={loading}
        className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add suburb"}
      </button>
      {error && <p className="text-red-600 text-xs w-full">{error}</p>}
    </form>
  );
}
