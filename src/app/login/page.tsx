"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      identifier: form.identifier,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (res?.ok) router.push("/");
    else setError("Invalid login or password");
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Email or nickname"
          required
          className="border rounded px-3 py-2"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          required
          className="border rounded px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="bg-orange-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        <Link href="/forgot-password" className="text-orange-600 underline">
          Forgot your password?
        </Link>
      </p>
      <p className="text-sm text-gray-500 mt-2">
        No account yet?{" "}
        <Link href="/register" className="text-orange-600 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
