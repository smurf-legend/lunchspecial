import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { noProfanity } from "@/lib/profanity";
import { getDigestSettings, DEFAULT_DIGEST_COPY } from "@/lib/digestSettings";
import { z } from "zod";

const settingsSchema = z.object({
  paused: z.boolean().optional(),
  fridaySubject: z.string().min(1).max(200).refine(noProfanity, { message: "Subject contains language that isn't allowed" }).optional(),
  fridayIntro: z.string().min(1).max(1000).refine(noProfanity, { message: "Intro contains language that isn't allowed" }).optional(),
  mondaySubject: z.string().min(1).max(200).refine(noProfanity, { message: "Subject contains language that isn't allowed" }).optional(),
  mondayIntro: z.string().min(1).max(1000).refine(noProfanity, { message: "Intro contains language that isn't allowed" }).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const settings = await getDigestSettings();
  return NextResponse.json({ settings, defaults: DEFAULT_DIGEST_COPY });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.digestSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });

  const settings = await getDigestSettings();
  return NextResponse.json({ settings });
}
