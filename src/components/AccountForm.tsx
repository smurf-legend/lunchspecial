"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SuburbAutocomplete from "@/components/SuburbAutocomplete";
import CuisinePreferencePicker from "@/components/CuisinePreferencePicker";

type Suburb = { name: string; slug: string; state: string };
type Category = { name: string; slug: string };

export default function AccountForm({
  initialName,
  initialMarketingOptIn,
  initialPreferredSuburbSlug,
  initialPreferredCategorySlugs,
}: {
  initialName: string;
  initialMarketingOptIn: boolean;
  initialPreferredSuburbSlug: string | null;
  initialPreferredCategorySlugs: string[];
}) {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [preferredSuburbSlug, setPreferredSuburbSlug] = useState<string | null>(
    initialPreferredSuburbSlug
  );
  const [preferredCategorySlugs, setPreferredCategorySlugs] = useState<string[]>(
    initialPreferredCategorySlugs
  );
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!marketingOptIn) return;
    fetch("/api/meta")
      .then((r) => r.json())
      .then((data) => {
        setSuburbs(data.suburbs ?? []);
        setCategories(data.categories ?? []);
      });
  }, [marketingOptIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (marketingOptIn && !preferredSuburbSlug) {
      setError("Pick a suburb so we know where to send deals from.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        marketingOptIn,
        // Kept even while unchecked — so re-opting in later doesn't lose
        // the suburb/cuisine choice someone already made.
        preferredSuburbSlug,
        preferredCategorySlugs,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(
        fieldError ||
          data.error?.formErrors?.[0] ||
          (typeof data.error === "string" ? data.error : null) ||
          "Failed to save changes"
      );
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

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <span>Send me a regular email with the best lunch deals near me.</span>
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
