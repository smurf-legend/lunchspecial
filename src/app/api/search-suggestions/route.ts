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

  return NextResponse.json({ specials });
}
