import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Category list only — suburb lookups moved to /api/suburbs/search, which
// searches server-side instead of shipping the whole (17.5k-row nationwide)
// suburb table to the browser just to filter it client-side.
export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } });
  return NextResponse.json({ categories });
}
