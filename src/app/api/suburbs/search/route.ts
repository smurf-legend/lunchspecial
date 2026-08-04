import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/suburbs/search?q=text[&state=NSW] — server-side suburb/postcode
// typeahead. Replaces shipping the entire suburb table to the browser
// (17.5k rows nationwide, ~1.7MB) just so components could filter it
// client-side — this queries the DB directly and returns only the top
// matches.
//
// The optional `state` filter is used by the homepage/browse search, since
// every listing right now is NSW-only — suggesting an interstate suburb
// there just leads to an empty results page. It's left off for the "Add a
// Special" and registration suburb pickers, where a future non-NSW
// contributor still needs to be able to find their own suburb.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const state = searchParams.get("state")?.trim().toUpperCase();
  if (!q) return NextResponse.json({ suburbs: [] });

  const suburbs = await prisma.suburb.findMany({
    where: {
      AND: [
        { OR: [{ name: { contains: q, mode: "insensitive" } }, { postcode: { startsWith: q } }] },
        ...(state ? [{ state }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { name: true, slug: true, postcode: true, state: true },
  });

  return NextResponse.json({ suburbs });
}
