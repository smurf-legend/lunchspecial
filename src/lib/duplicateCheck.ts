import { prisma } from "@/lib/prisma";

// A duplicate = same venue, same suburb, and (same price OR same title) —
// tight enough to avoid false positives against venues with several
// genuinely different specials (common — e.g. a pub with both a schnitzel
// and a pizza deal).
export async function findDuplicateSpecials({
  venueName,
  suburbSlugs,
  specialPrice,
  title,
  chainWide,
  excludeId,
}: {
  venueName: string;
  suburbSlugs: string[];
  specialPrice: number;
  title: string;
  chainWide?: boolean;
  excludeId?: string;
}) {
  const candidates = await prisma.special.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      venueName: { equals: venueName.trim(), mode: "insensitive" },
      // A chain-wide deal has no suburbs to match against — same venue name
      // is the only signal available. Otherwise, only compare against
      // specials sharing at least one of the same suburbs.
      ...(chainWide
        ? {}
        : { suburbs: { some: { suburb: { slug: { in: suburbSlugs } } } } }),
    },
    include: { suburbs: { include: { suburb: true } } },
  });

  const normalizedTitle = title.trim().toLowerCase();

  return candidates.filter(
    (c) => c.specialPrice === specialPrice || c.title.trim().toLowerCase() === normalizedTitle
  );
}
