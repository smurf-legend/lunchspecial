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

  const comment = await prisma.blogComment.create({
    data: {
      body: parsed.data.body,
      parentId: parsed.data.parentId,
      blogPostId: params.id,
      authorId,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
