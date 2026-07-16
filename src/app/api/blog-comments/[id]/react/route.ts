import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/blog-comments/:id/react  body: { value: 1 | -1 }
// Mirrors /api/comments/:id/react for Special comments.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const blogCommentId = params.id;

  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const existing = await prisma.blogCommentReaction.findUnique({
    where: { userId_blogCommentId: { userId, blogCommentId } },
  });

  let likeDelta = 0;
  let dislikeDelta = 0;

  if (!existing) {
    await prisma.blogCommentReaction.create({ data: { userId, blogCommentId, value } });
    if (value === 1) likeDelta = 1;
    else dislikeDelta = 1;
  } else if (existing.value === value) {
    await prisma.blogCommentReaction.delete({ where: { id: existing.id } });
    if (value === 1) likeDelta = -1;
    else dislikeDelta = -1;
  } else {
    await prisma.blogCommentReaction.update({ where: { id: existing.id }, data: { value } });
    if (value === 1) {
      likeDelta = 1;
      dislikeDelta = -1;
    } else {
      likeDelta = -1;
      dislikeDelta = 1;
    }
  }

  const comment = await prisma.blogComment.update({
    where: { id: blogCommentId },
    data: {
      likeCount: { increment: likeDelta },
      dislikeCount: { increment: dislikeDelta },
    },
  });

  return NextResponse.json({ likeCount: comment.likeCount, dislikeCount: comment.dislikeCount });
}
