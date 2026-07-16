"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccountForm({
  initialName,
  email,
  initialMarketingOptIn,
}: {
  initialName: string;
  email: string;
  initialMarketingOptIn: boolean;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, marketingOptIn }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || data.error || "Failed to save changes");
      return;
    }

    // Force the JWT session to pick up the new name immediately, rather
    // than showing the old one in the nav until next login.
    if (name !== initialName) await update({ name });
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Nickname</label>
        <input
          type="text"
          required
          maxLength={100}
          className="border rounded px-3 py-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          The name other people see next to your posts and comments — must be unique.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Email</label>
        <input
          type="email"
          disabled
          className="border rounded px-3 py-2 w-full bg-gray-50 text-gray-500"
          value={email}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <span>Send me a regular email with the best lunch deals near me.</span>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-700 text-sm">Saved.</p>}

      <button
        disabled={loading}
        className="self-start bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
