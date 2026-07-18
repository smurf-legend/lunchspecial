"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AU_STATES } from "@/lib/auStates";

export default function AdminAddSuburb() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", postcode: "", state: "NSW", region: "" });
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

    setForm({ name: "", postcode: "", state: form.state, region: form.region });
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
      <div>
        <label className="text-xs text-gray-500 block mb-1">State</label>
        <select
          className="border rounded px-2 py-1.5 text-sm"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
        >
          {AU_STATES.map(({ code }) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Region</label>
        <input
          type="text"
          required
          list="region-suggestions"
          placeholder="e.g. Inner West, Central Coast..."
          className="border rounded px-2 py-1.5 text-sm"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
        />
        <datalist id="region-suggestions">
          <option value="Central" />
          <option value="North" />
          <option value="East" />
          <option value="South" />
          <option value="West" />
        </datalist>
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
