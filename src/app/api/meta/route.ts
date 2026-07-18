import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [suburbs, categories] = await Promise.all([
    prisma.suburb.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true, region: true, state: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  return NextResponse.json({ suburbs, categories });
}
