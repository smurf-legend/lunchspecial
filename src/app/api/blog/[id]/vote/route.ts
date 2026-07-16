import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/blog/:id/vote  body: { value: 1 | -1 }
// Same toggle/switch behavior as the Special vote route.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const blogPostId = params.id;

  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const existing = await prisma.blogVote.findUnique({
    where: { userId_blogPostId: { userId, blogPostId } },
  });

  let scoreDelta = 0;
  let upvoteDelta = 0;
  let downvoteDelta = 0;

  if (!existing) {
    await prisma.blogVote.create({ data: { userId, blogPostId, value } });
    scoreDelta = value;
    if (value === 1) upvoteDelta = 1;
    else downvoteDelta = 1;
  } else if (existing.value === value) {
    await prisma.blogVote.delete({ where: { id: existing.id } });
    scoreDelta = -value;
    if (value === 1) upvoteDelta = -1;
    else downvoteDelta = -1;
  } else {
    await prisma.blogVote.update({ where: { id: existing.id }, data: { value } });
    scoreDelta = value * 2;
    if (value === 1) {
      upvoteDelta = 1;
      downvoteDelta = -1;
    } else {
      upvoteDelta = -1;
      downvoteDelta = 1;
    }
  }

  const post = await prisma.blogPost.update({
    where: { id: blogPostId },
    data: {
      score: { increment: scoreDelta },
      upvoteCount: { increment: upvoteDelta },
      downvoteCount: { increment: downvoteDelta },
    },
  });

  return NextResponse.json({
    score: post.score,
    upvoteCount: post.upvoteCount,
    downvoteCount: post.downvoteCount,
  });
}
