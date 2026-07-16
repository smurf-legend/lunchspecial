"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string | Date;
  _count: { specials: number; comments: number; votes: number };
};

export default function AdminUserRow({
  user,
  isSelf,
}: {
  user: UserRow;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole() {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (
      !confirm(
        nextRole === "admin"
          ? `Make ${user.name || user.email} an admin? They'll get full access to this panel.`
          : `Remove admin access from ${user.name || user.email}?`
      )
    )
      return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update role");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between p-3 text-sm">
      <div>
        <span className="font-medium">{user.name || "(no name)"}</span>{" "}
        <span className="text-gray-500">{user.email}</span>{" "}
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            user.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.role}
        </span>
        {isSelf && <span className="text-xs text-gray-400 ml-1">(you)</span>}
        <p className="text-gray-500 text-xs mt-0.5">
          Joined {new Date(user.createdAt).toLocaleDateString()} · {user._count.specials} specials ·{" "}
          {user._count.comments} comments · {user._count.votes} votes
        </p>
        {error && <p className="text-red-600 text-xs mt-0.5">{error}</p>}
      </div>
      {isSelf ? (
        <span className="text-xs text-gray-300 border rounded px-3 py-1.5">Can't change own role</span>
      ) : (
        <button
          disabled={loading}
          onClick={toggleRole}
          className={`text-xs font-medium border rounded px-3 py-1.5 disabled:opacity-50 ${
            user.role === "admin"
              ? "text-red-600 border-red-200 hover:bg-red-50"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          {loading ? "Saving..." : user.role === "admin" ? "Remove admin" : "Make admin"}
        </button>
      )}
    </div>
  );
}
