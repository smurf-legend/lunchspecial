"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to reset password");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="text-sm text-gray-600">
          This reset link is missing its token. Request a new one from the{" "}
          <Link href="/forgot-password" className="text-orange-600 underline">
            forgot password
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border text-center">
        <h1 className="text-xl font-bold mb-2">Password updated</h1>
        <p className="text-sm text-gray-600">Taking you to the login page...</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">Set a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="New password (min 8 characters)"
          required
          minLength={8}
          className="border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="bg-orange-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
