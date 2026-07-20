"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Subscriber = {
  id: string;
  name: string | null;
  email: string;
  preferredSuburb: { name: string } | null;
  preferredCategorySlugs: string[];
  createdAt: string | Date;
};

export default function AdminSubscriberRow({ subscriber }: { subscriber: Subscriber }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function unsubscribe() {
    if (!confirm(`Unsubscribe ${subscriber.name || subscriber.email} from the deals digest?`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${subscriber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingOptIn: false }),
    });
    setLoading(false);
    if (res.ok) {
      setRemoved(true);
      router.refresh();
    }
  }

  if (removed) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 text-sm">
      <div>
        <span className="font-medium">{subscriber.name || "(no name)"}</span>{" "}
        <span className="text-gray-500">{subscriber.email}</span>
        <p className="text-gray-500 text-xs mt-0.5">
          {subscriber.preferredSuburb?.name ?? "no suburb set"}
          {subscriber.preferredCategorySlugs.length > 0 &&
            ` · ${subscriber.preferredCategorySlugs.join(", ")}`}{" "}
          · joined {new Date(subscriber.createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        disabled={loading}
        onClick={unsubscribe}
        className="text-red-600 text-xs font-medium border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Unsubscribe"}
      </button>
    </div>
  );
}
