import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { noProfanity, profanityMessage } from "@/lib/profanity";
import { z } from "zod";

const blogPostSchema = z.object({
  title: z.string().min(3).max(200).refine(noProfanity, profanityMessage("Title")),
  excerpt: z
    .string()
    .max(300)
    .refine(noProfanity, profanityMessage("Excerpt"))
    .optional(),
  body: z.string().min(10).refine(noProfanity, profanityMessage("Body")),
  imageUrl: z.string().url().optional(),
  hidden: z.boolean().optional().default(false),
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

// POST /api/admin/blog — create a new article (admin only, unlike Special
// which any logged-in user can post)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.title);
  if (!baseSlug) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  // Titles can repeat ("Weekly roundup" every week) — dedupe with a numeric
  // suffix rather than rejecting the post outright.
  let slug = baseSlug;
  let n = 2;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n}`;
    n++;
  }

  const post = await prisma.blogPost.create({
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || undefined,
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl,
      hidden: parsed.data.hidden,
      publishAt: parsed.data.publishAt,
      slug,
      authorId: (session.user as any).id,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
