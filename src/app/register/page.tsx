"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import SuburbAutocomplete from "@/components/SuburbAutocomplete";
import CuisinePreferencePicker from "@/components/CuisinePreferencePicker";

type Suburb = { name: string; slug: string; state: string };
type Category = { name: string; slug: string };

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [preferredSuburbSlug, setPreferredSuburbSlug] = useState<string | null>(null);
  const [preferredCategorySlugs, setPreferredCategorySlugs] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((data) => {
        setSuburbs(data.suburbs ?? []);
        setCategories(data.categories ?? []);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (marketingOptIn && !preferredSuburbSlug) {
      setError("Pick a suburb so we know where to send deals from.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        marketingOptIn,
        preferredSuburbSlug: marketingOptIn ? preferredSuburbSlug : undefined,
        preferredCategorySlugs: marketingOptIn ? preferredCategorySlugs : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(
        fieldError ||
          data.error?.formErrors?.[0] ||
          (typeof data.error === "string" ? data.error : null) ||
          "Registration failed"
      );
      setLoading(false);
      return;
    }

    // auto sign in after registering
    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.ok) router.push("/");
    else router.push("/login");
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <input
            type="text"
            placeholder="Nickname"
            required
            maxLength={100}
            className="border rounded px-3 py-2 w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            This is the name other people will see next to your posts and comments — it doesn't
            have to be your real name, and it must be unique.
          </p>
        </div>
        <input
          type="email"
          placeholder="Email"
          required
          className="border rounded px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
          className="border rounded px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span>
            Send me a regular email with the best lunch deals near me. You can unsubscribe anytime
            — we won't send anything else.
          </span>
        </label>

        {marketingOptIn && (
          <div className="flex flex-col gap-3 pl-3 border-l-2 border-orange-100">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Which suburb do you want lunch deals from?
              </label>
              <SuburbAutocomplete
                suburbs={suburbs}
                value={preferredSuburbSlug}
                onChange={setPreferredSuburbSlug}
              />
              <p className="text-xs text-gray-400 mt-1">
                We'll email you the best specials near this suburb — you can change it anytime in
                your profile.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Any cuisines you especially want? (optional)
              </label>
              <CuisinePreferencePicker
                categories={categories}
                selected={preferredCategorySlugs}
                onChange={setPreferredCategorySlugs}
              />
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="bg-orange-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-orange-600 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
