import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/specials/:id/vote  body: { value: 1 | -1 }
// Posting the same value again removes the vote (toggle).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const specialId = params.id;

  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const existing = await prisma.vote.findUnique({
    where: { userId_specialId: { userId, specialId } },
  });

  let scoreDelta = 0;
  let upvoteDelta = 0;
  let downvoteDelta = 0;

  if (!existing) {
    await prisma.vote.create({ data: { userId, specialId, value } });
    scoreDelta = value;
    if (value === 1) upvoteDelta = 1;
    else downvoteDelta = 1;
  } else if (existing.value === value) {
    await prisma.vote.delete({ where: { id: existing.id } });
    scoreDelta = -value;
    if (value === 1) upvoteDelta = -1;
    else downvoteDelta = -1;
  } else {
    await prisma.vote.update({ where: { id: existing.id }, data: { value } });
    scoreDelta = value * 2;
    if (value === 1) {
      upvoteDelta = 1;
      downvoteDelta = -1;
    } else {
      upvoteDelta = -1;
      downvoteDelta = 1;
    }
  }

  const special = await prisma.special.update({
    where: { id: specialId },
    data: {
      score: { increment: scoreDelta },
      upvoteCount: { increment: upvoteDelta },
      downvoteCount: { increment: downvoteDelta },
    },
  });

  return NextResponse.json({
    score: special.score,
    upvoteCount: special.upvoteCount,
    downvoteCount: special.downvoteCount,
  });
}
