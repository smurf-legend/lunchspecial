import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const special = await prisma.special.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true } },
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true } },
          replies: { include: { author: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!special) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ special });
}
