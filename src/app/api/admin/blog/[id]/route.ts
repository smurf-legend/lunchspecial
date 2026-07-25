import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { noProfanity, profanityMessage } from "@/lib/profanity";
import { z } from "zod";

const blogPostUpdateSchema = z.object({
  title: z.string().min(3).max(200).refine(noProfanity, profanityMessage("Title")),
  excerpt: z
    .string()
    .max(300)
    .refine(noProfanity, profanityMessage("Excerpt"))
    .optional()
    .nullable(),
  body: z.string().min(10).refine(noProfanity, profanityMessage("Body")),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  hidden: z.boolean().optional(),
  // "Publish now" sends the current instant, which is already in the past
  // by the time this validates server-side — so this only checks the value
  // is a real timestamp, not that it's in the future. The scheduling UI
  // itself (BlogForm's datetime-local `min`) is what stops picking a past
  // date for an actual schedule.
  publishAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
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
  const parsed = blogPostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { imageUrl, ...data } = parsed.data;

  const post = await prisma.blogPost.update({
    where: { id: params.id },
    data: {
      ...data,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await prisma.blogPost.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
