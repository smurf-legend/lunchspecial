"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  paused: boolean;
  friday: { subject: string; intro: string };
  monday: { subject: string; intro: string };
};

export default function DigestSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [paused, setPaused] = useState(settings.paused);
  const [fridaySubject, setFridaySubject] = useState(settings.friday.subject);
  const [fridayIntro, setFridayIntro] = useState(settings.friday.intro);
  const [mondaySubject, setMondaySubject] = useState(settings.monday.subject);
  const [mondayIntro, setMondayIntro] = useState(settings.monday.intro);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/admin/digest/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused, fridaySubject, fridayIntro, mondaySubject, mondayIntro }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || "Failed to save settings");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
        Pause scheduled digest emails (Friday &amp; Monday sends won't go out while this is on)
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Friday — "try these next week"</h3>
          <label className="text-xs text-gray-500">
            Subject
            <input
              className="border rounded px-3 py-2 w-full mt-0.5"
              value={fridaySubject}
              onChange={(e) => setFridaySubject(e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-500">
            Intro
            <textarea
              className="border rounded px-3 py-2 w-full mt-0.5"
              rows={3}
              value={fridayIntro}
              onChange={(e) => setFridayIntro(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Monday — "this week's top rated"</h3>
          <label className="text-xs text-gray-500">
            Subject
            <input
              className="border rounded px-3 py-2 w-full mt-0.5"
              value={mondaySubject}
              onChange={(e) => setMondaySubject(e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-500">
            Intro
            <textarea
              className="border rounded px-3 py-2 w-full mt-0.5"
              rows={3}
              value={mondayIntro}
              onChange={(e) => setMondayIntro(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && !error && <p className="text-green-700 text-sm">Saved.</p>}

      <button
        disabled={saving}
        onClick={save}
        className="self-start bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}
