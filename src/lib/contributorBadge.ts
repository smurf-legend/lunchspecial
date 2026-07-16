export type ContributorTier = "top" | "regular" | null;

// Posting is weighted more heavily than commenting (posting a real deal is
// more effort/value than a comment), but heavy commenters still qualify.
export function getContributorTier(specials: number, comments: number): ContributorTier {
  if (specials >= 15 || specials + comments >= 30) return "top";
  if (specials >= 5 || specials + comments >= 10) return "regular";
  return null;
}
