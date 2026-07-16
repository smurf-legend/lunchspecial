"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.fieldErrors?.newEmail?.[0] || data.error || "Failed to update email");
      return;
    }

    await update({ email: newEmail });
    setSuccess(true);
    setNewEmail("");
    setCurrentPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Current email</label>
        <input
          type="email"
          disabled
          className="border rounded px-3 py-2 w-full bg-gray-50 text-gray-500"
          value={currentEmail}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">New email</label>
        <input
          type="email"
          required
          className="border rounded px-3 py-2 w-full"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Current password</label>
        <input
          type="password"
          required
          className="border rounded px-3 py-2 w-full"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Confirm it's you before we change your email.</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-700 text-sm">Email updated.</p>}

      <button
        disabled={loading}
        className="self-start bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Update email"}
      </button>
    </form>
  );
}
