"use client";
import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(
        data.error?.fieldErrors?.newPassword?.[0] || data.error || "Failed to update password"
      );
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Current password</label>
        <input
          type="password"
          required
          className="border rounded px-3 py-2 w-full"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">New password</label>
        <input
          type="password"
          required
          minLength={8}
          placeholder="Min 8 characters"
          className="border rounded px-3 py-2 w-full"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-700 text-sm">Password updated.</p>}

      <button
        disabled={loading}
        className="self-start bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}
