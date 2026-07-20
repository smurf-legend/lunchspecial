import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCommentAndDescendants } from "@/lib/commentTree";
import { noProfanity } from "@/lib/profanity";
import { z } from "zod";

const commentUpdateSchema = z.object({
  body: z
    .string()
    .min(1)
    .max(2000)
    .refine(noProfanity, { message: "Comment contains language that isn't allowed" })
    .optional(),
  hidden: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = commentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.comment.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ comment });
}

// Recursively deletes this comment and every reply nested under it — the
// self-relation FK is NoAction, not Cascade, so a plain delete would fail
// (or orphan replies) once threads can nest.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await deleteCommentAndDescendants(params.id);
  return NextResponse.json({ success: true });
}
