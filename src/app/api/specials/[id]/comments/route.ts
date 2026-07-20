import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { noProfanity } from "@/lib/profanity";
import { z } from "zod";

const commentSchema = z.object({
  body: z.string().min(1).max(2000).refine(noProfanity, { message: "Comment contains language that isn't allowed" }),
  parentId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const authorId = (session.user as any).id as string;

  const comment = await prisma.comment.create({
    data: {
      body: parsed.data.body,
      parentId: parsed.data.parentId,
      specialId: params.id,
      authorId,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  // Notify whoever should hear about this — the post's author for a
  // top-level comment, or the parent comment's author for a reply. Never
  // notify yourself for commenting/replying on your own stuff.
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { authorId: true },
    });
    if (parent && parent.authorId !== authorId) {
      await prisma.notification.create({
        data: {
          type: "reply_to_comment",
          userId: parent.authorId,
          actorId: authorId,
          specialId: params.id,
          commentId: comment.id,
        },
      });
    }
  } else {
    const special = await prisma.special.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    if (special && special.authorId !== authorId) {
      await prisma.notification.create({
        data: {
          type: "comment_on_post",
          userId: special.authorId,
          actorId: authorId,
          specialId: params.id,
          commentId: comment.id,
        },
      });
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}
