"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({
  specialId,
  initialFavorited,
}: {
  specialId: string;
  initialFavorited: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/specials/${specialId}/favorite`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setFavorited(data.favorited);
    }
  }

  return (
    <button
      disabled={loading}
      onClick={toggle}
      className={`text-xs px-2 py-1 rounded-full font-medium border shrink-0 disabled:opacity-50 ${
        favorited ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-600"
      }`}
    >
      {loading ? "Saving..." : favorited ? "Remove from favourites" : "Add to favourites"}
    </button>
  );
}
