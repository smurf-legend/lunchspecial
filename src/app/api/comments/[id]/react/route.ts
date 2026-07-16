import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/comments/:id/react  body: { value: 1 | -1 }
// Posting the same value again removes the reaction (toggle); posting the
// other value switches it. Mirrors the special vote route's behavior.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const commentId = params.id;

  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const existing = await prisma.commentReaction.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  let likeDelta = 0;
  let dislikeDelta = 0;

  if (!existing) {
    await prisma.commentReaction.create({ data: { userId, commentId, value } });
    if (value === 1) likeDelta = 1;
    else dislikeDelta = 1;
  } else if (existing.value === value) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });
    if (value === 1) likeDelta = -1;
    else dislikeDelta = -1;
  } else {
    await prisma.commentReaction.update({ where: { id: existing.id }, data: { value } });
    if (value === 1) {
      likeDelta = 1;
      dislikeDelta = -1;
    } else {
      likeDelta = -1;
      dislikeDelta = 1;
    }
  }

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      likeCount: { increment: likeDelta },
      dislikeCount: { increment: dislikeDelta },
    },
  });

  return NextResponse.json({ likeCount: comment.likeCount, dislikeCount: comment.dislikeCount });
}
