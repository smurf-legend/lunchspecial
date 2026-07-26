import { prisma } from "@/lib/prisma";

// Generic/site-wide words that would otherwise match almost every Special
// regardless of actual topic (e.g. nearly every row mentions "Sydney" or
// "lunch" somewhere, and prose titles are full of filler adjectives/adverbs
// like "worth" or "actually" that happen to also show up in unrelated
// descriptions), plus ordinary English stopwords — all of these would turn
// "relevance" matching into "everything matches everything." Confirmed by
// an actual false-positive during testing: an article titled "...Actually
// Worth It" matched a burger special purely because its description
// happened to contain the sentence "Worth it."
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "from", "this",
  "that", "was", "were", "will", "would", "could", "should", "about", "into",
  "over", "just", "very", "really", "truly", "genuinely", "totally", "literally",
  "basically", "actually", "worth", "been", "being", "have", "has", "had",
  "does", "did", "who", "what", "which", "when", "where", "why", "how",
  "sydney", "lunch", "special", "specials", "food", "table", "talk",
  "influencer", "influencers", "week", "weekly", "guy", "story", "deal", "deals",
  "menu", "choice", "order", "price", "meal", "meals",
]);

function extractKeywords(title: string): string[] {
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    ),
  ];
}

// Simple keyword-overlap match between an article's title and a Special's
// title/venueName — no ML, just enough to surface an obviously on-topic
// deal (a kebab article linking to an actual kebab special) without needing
// a manual "related specials" picker in the admin form. Deliberately does
// NOT match against `description` — that field is free-text prose, and
// matching against it lets generic filler words produce false positives no
// stopword list can fully cover (see above). title/venueName are short and
// specific (dish names, venue names), so a hit there is a real signal.
export async function getRelatedSpecials(title: string, limit = 3) {
  const keywords = extractKeywords(title);
  if (keywords.length === 0) return [];

  return prisma.special.findMany({
    where: {
      hidden: false,
      OR: keywords.flatMap((kw) => [
        { title: { contains: kw, mode: "insensitive" as const } },
        { venueName: { contains: kw, mode: "insensitive" as const } },
      ]),
    },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      _count: { select: { comments: true } },
    },
  });
}
