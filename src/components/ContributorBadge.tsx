import { getContributorTier } from "@/lib/contributorBadge";

export default function ContributorBadge({ specials, comments }: { specials: number; comments: number }) {
  const tier = getContributorTier(specials, comments);
  if (!tier) return null;

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        tier === "top" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {tier === "top" ? "⭐ Top Contributor" : "Regular"}
    </span>
  );
}
