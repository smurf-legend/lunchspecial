import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/specials/:id/favorite — toggles the current user's favorite on
// this special. No denormalized count on Special — this is a private
// per-user saved list, not a public signal like Vote.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const specialId = params.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_specialId: { userId, specialId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId, specialId } });
  return NextResponse.json({ favorited: true });
}
