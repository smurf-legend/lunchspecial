"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DeleteAccountForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        "Delete your account? Your votes, favourites and comment reactions will be removed. Deals and comments you've posted will stay up, credited to \"Deleted User\". This can't be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setLoading(false);
      setError(data.error || "Failed to delete account");
      return;
    }

    signOut({ callbackUrl: "/" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        This permanently deletes your account. Deals and comments you've posted
        stay up (credited to "Deleted User") but your votes, favourites and
        login are gone for good.
      </p>
      <div>
        <label className="text-sm font-medium mb-1 block">Confirm your password</label>
        <input
          type="password"
          required
          className="border rounded px-3 py-2 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        disabled={loading}
        className="self-start bg-red-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete my account"}
      </button>
    </form>
  );
}
