"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({
  specialId,
  initialFavorited,
  size = "text-xl",
}: {
  specialId: string;
  initialFavorited: boolean;
  size?: string;
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
      className={`${size} hover:scale-110 transition-transform disabled:opacity-50 ${
        favorited ? "" : "grayscale opacity-40"
      }`}
      aria-label={favorited ? "Remove from favourites" : "Save to favourites"}
      title={favorited ? "Remove from favourites" : "Save to favourites"}
    >
      🔖
    </button>
  );
}
