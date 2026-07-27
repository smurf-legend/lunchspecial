import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/search-suggestions?q=text — lightweight typeahead suggestions for
// the homepage search bar, used once the typed text doesn't match a known
// suburb/postcode (that case is covered client-side from the suburb list).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ specials: [] });

  const specials = await prisma.special.findMany({
    where: {
      hidden: false,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { venueName: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { score: "desc" },
    take: 6,
    select: { id: true, title: true, venueName: true },
  });

  // A typo or near-miss otherwise shows an empty dropdown even when a close
  // match exists — fall back to trigram similarity so the suggestions stay
  // useful instead of just going quiet.
  if (specials.length === 0) {
    const candidates = await prisma.$queryRaw<{ id: string; sim: number }[]>`
      SELECT id, GREATEST(
        similarity(unaccent(title), unaccent(${q})),
        similarity(unaccent("venueName"), unaccent(${q}))
      ) AS sim
      FROM "Special"
      WHERE hidden = false
      ORDER BY sim DESC
      LIMIT 6
    `;
    const relevantIds = candidates.filter((c) => c.sim > 0.15).map((c) => c.id);
    if (relevantIds.length > 0) {
      const rows = await prisma.special.findMany({
        where: { id: { in: relevantIds } },
        select: { id: true, title: true, venueName: true },
      });
      const rank = new Map(relevantIds.map((id, i) => [id, i]));
      rows.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
      return NextResponse.json({ specials: rows });
    }
  }

  return NextResponse.json({ specials });
}
