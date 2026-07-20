"use client";
import { useState } from "react";
import CuisinePreferencePicker from "@/components/CuisinePreferencePicker";

type Suburb = { name: string; slug: string };
type Category = { name: string; slug: string };

export default function DigestTestSendForm({
  suburbs,
  categories,
  defaultEmail,
}: {
  suburbs: Suburb[];
  categories: Category[];
  defaultEmail: string;
}) {
  const [mode, setMode] = useState<"friday" | "monday">("friday");
  const [suburbSlug, setSuburbSlug] = useState(suburbs[0]?.slug ?? "");
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/digest/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, suburbSlug, categorySlugs, email }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Failed to send test digest");
      return;
    }
    setResult(`Sent to ${data.sentTo} with ${data.itemCount} special${data.itemCount === 1 ? "" : "s"}.`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-gray-500">
          Mode
          <select
            className="border rounded px-3 py-2 block mt-0.5"
            value={mode}
            onChange={(e) => setMode(e.target.value as "friday" | "monday")}
          >
            <option value="friday">Friday preview</option>
            <option value="monday">Monday top-rated</option>
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Suburb
          <select
            className="border rounded px-3 py-2 block mt-0.5"
            value={suburbSlug}
            onChange={(e) => setSuburbSlug(e.target.value)}
          >
            {suburbs.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex-1 min-w-[180px]">
          Send to
          <input
            type="email"
            className="border rounded px-3 py-2 w-full mt-0.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Cuisines (optional filter)</p>
        <CuisinePreferencePicker categories={categories} selected={categorySlugs} onChange={setCategorySlugs} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {result && !error && <p className="text-green-700 text-sm">{result}</p>}

      <button
        disabled={sending || !suburbSlug}
        onClick={send}
        className="self-start bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send test digest"}
      </button>
    </div>
  );
}
