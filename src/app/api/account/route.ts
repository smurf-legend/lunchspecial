import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const accountUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.name) {
    // Case-insensitive so "JohnDoe" and "johndoe" can't both be taken —
    // findUnique can't take a mode filter, so this needs findFirst.
    const existing = await prisma.user.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "That nickname is already taken" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, marketingOptIn: true },
  });

  return NextResponse.json({ user });
}

const deleteSchema = z.object({
  password: z.string().min(1),
});

// Content authored by a deleted user (specials, comments, blog posts/comments)
// is reassigned here rather than cascade-deleted or blocked, since this is a
// crowdsourced site where other people's deals/discussion routinely depend
// on that content staying visible. Personal interaction data (votes,
// favorites, reactions, notifications) is genuinely theirs and is removed.
const DELETED_USER_EMAIL = "deleted-user@lunchspecial.internal";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Password is incorrect" }, { status: 401 });
  }

  if (user.role === "admin") {
    const otherAdmins = await prisma.user.count({
      where: { role: "admin", id: { not: userId } },
    });
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "You're the only admin — promote another account to admin before deleting this one." },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction(
    async (tx) => {
      const placeholder = await tx.user.upsert({
        where: { email: DELETED_USER_EMAIL },
        update: {},
        create: {
          name: "Deleted User",
          email: DELETED_USER_EMAIL,
          passwordHash: null,
          role: "user",
        },
      });

      // Reverse this user's votes/reactions on the counters they affected —
      // cascading the row deletion below won't run the app-level counter
      // logic that normally lives in the vote/react POST handlers.
      const votes = await tx.vote.findMany({ where: { userId } });
      for (const vote of votes) {
        await tx.special.update({
          where: { id: vote.specialId },
          data: {
            score: { decrement: vote.value },
            upvoteCount: vote.value === 1 ? { decrement: 1 } : undefined,
            downvoteCount: vote.value === -1 ? { decrement: 1 } : undefined,
          },
        });
      }

      const commentReactions = await tx.commentReaction.findMany({ where: { userId } });
      for (const reaction of commentReactions) {
        await tx.comment.update({
          where: { id: reaction.commentId },
          data: {
            likeCount: reaction.value === 1 ? { decrement: 1 } : undefined,
            dislikeCount: reaction.value === -1 ? { decrement: 1 } : undefined,
          },
        });
      }

      const blogVotes = await tx.blogVote.findMany({ where: { userId } });
      for (const vote of blogVotes) {
        await tx.blogPost.update({
          where: { id: vote.blogPostId },
          data: {
            score: { decrement: vote.value },
            upvoteCount: vote.value === 1 ? { decrement: 1 } : undefined,
            downvoteCount: vote.value === -1 ? { decrement: 1 } : undefined,
          },
        });
      }

      const blogCommentReactions = await tx.blogCommentReaction.findMany({ where: { userId } });
      for (const reaction of blogCommentReactions) {
        await tx.blogComment.update({
          where: { id: reaction.blogCommentId },
          data: {
            likeCount: reaction.value === 1 ? { decrement: 1 } : undefined,
            dislikeCount: reaction.value === -1 ? { decrement: 1 } : undefined,
          },
        });
      }

      // Reassign authored content to the placeholder before the real user
      // row (and its personal data, via cascade) is deleted.
      await tx.special.updateMany({ where: { authorId: userId }, data: { authorId: placeholder.id } });
      await tx.comment.updateMany({ where: { authorId: userId }, data: { authorId: placeholder.id } });
      await tx.blogPost.updateMany({ where: { authorId: userId }, data: { authorId: placeholder.id } });
      await tx.blogComment.updateMany({ where: { authorId: userId }, data: { authorId: placeholder.id } });

      // Cascades: Vote, Favorite, CommentReaction, BlogVote,
      // BlogCommentReaction, Notification (both directions).
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 20000 }
  );

  return NextResponse.json({ success: true });
}
