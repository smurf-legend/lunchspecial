"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border text-center">
        <h1 className="text-xl font-bold mb-2">Check your email</h1>
        <p className="text-sm text-gray-600">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password.
        </p>
        <Link href="/login" className="text-orange-600 underline text-sm mt-4 inline-block">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-2">Forgot your password?</h1>
      <p className="text-sm text-gray-500 mb-4">
        Enter your account email and we'll send you a link to reset it.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          required
          className="border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          disabled={loading}
          className="bg-orange-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-orange-600 underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
