import { prisma } from "@/lib/prisma";

export type DigestMode = "friday" | "monday";

// Below this many matching deals, the email isn't worth sending — better to
// skip a week than send someone a near-empty email, especially in suburbs
// that aren't well seeded yet.
const MIN_DIGEST_ITEMS = 2;
const MAX_DIGEST_ITEMS = 6;

// Friday = "try these next week" — deals near them they haven't voted on
// yet, so it reads as discovery rather than a repeat of what they already
// know. Monday = "this week's top rated" — a quick, trustworthy pick for
// anyone who didn't plan ahead, sorted by the same score used everywhere
// else on the site.
export async function getDigestSpecialsForUser(
  userId: string,
  preferredSuburbId: string,
  preferredCategorySlugs: string[],
  mode: DigestMode
) {
  const and: any[] = [
    { hidden: false, needsReview: false },
    { OR: [{ suburbs: { some: { suburbId: preferredSuburbId } } }, { chainWide: true }] },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  ];

  if (preferredCategorySlugs.length > 0) {
    and.push({ categories: { some: { category: { slug: { in: preferredCategorySlugs } } } } });
  }

  if (mode === "friday") {
    and.push({ votes: { none: { userId } } });
  }

  return prisma.special.findMany({
    where: { AND: and },
    orderBy: { score: "desc" },
    take: MAX_DIGEST_ITEMS,
    include: { suburbs: { include: { suburb: true } } },
  });
}

export function meetsDigestThreshold(specials: unknown[]): boolean {
  return specials.length >= MIN_DIGEST_ITEMS;
}
