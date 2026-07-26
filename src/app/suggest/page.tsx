"use client";

import { useState } from "react";
import Link from "next/link";

export default function SuggestPage() {
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [company, setCompany] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) {
      setError("Give us at least a rough idea of the deal.");
      return;
    }
    setSubmitting(true);
    setError(null);

    let imageUrl = "";
    if (imageFile) {
      const uploadRes = await fetch(`/api/tips/upload`, {
        method: "POST",
        headers: { "Content-Type": imageFile.type },
        body: imageFile,
      });
      if (!uploadRes.ok) {
        setSubmitting(false);
        setError("Couldn't upload that photo — try a different one, or just leave it off.");
        return;
      }
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.url;
    }

    const res = await fetch("/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details, link, imageUrl, company }),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError("Something went wrong sending that — mind trying again?");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center flex flex-col gap-3">
        <p className="text-lg font-semibold">Got it, thanks! 🙌</p>
        <p className="text-sm text-gray-500">
          We'll take a look and get it posted if it checks out.
        </p>
        <Link href="/" className="text-orange-600 underline font-medium text-sm">
          Back to specials
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg border flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Got a special worth sharing?</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send us the details, or just a link and a photo — no account needed. We'll do
          the rest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          // Honeypot — invisible to real visitors, but a bot filling every
          // field on the page will fill this one too.
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
          aria-hidden="true"
        >
          <label>
            Company
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">What's the deal?</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={5}
            placeholder="e.g. The Local Cafe on X Street does a $15 pasta lunch special Mon–Fri, 12–3pm"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link (optional)</label>
          <input
            type="url"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageSelect} />
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-orange-600 text-white font-medium px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send it in"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Prefer to do it properly?{" "}
          <Link href="/specials/new" className="text-orange-600 hover:underline">
            Post it yourself instead
          </Link>
        </p>
      </form>
    </div>
  );
}
