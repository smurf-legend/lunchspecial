import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/suburbs/search?q=text — server-side suburb/postcode typeahead.
// Replaces shipping the entire suburb table to the browser (17.5k rows
// nationwide, ~1.7MB) just so components could filter it client-side —
// this queries the DB directly and returns only the top matches.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ suburbs: [] });

  const suburbs = await prisma.suburb.findMany({
    where: {
      OR: [{ name: { contains: q, mode: "insensitive" } }, { postcode: { startsWith: q } }],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { name: true, slug: true, postcode: true, state: true },
  });

  return NextResponse.json({ suburbs });
}
