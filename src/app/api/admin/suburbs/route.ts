import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const suburbSchema = z.object({
  name: z.string().min(1),
  postcode: z.string().min(4).max(4),
  state: z.string().min(2).max(3),
  region: z.string().min(1).max(40),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = suburbSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, postcode, state, region } = parsed.data;

  // Suburb names repeat across states (Richmond, Windsor, Kingston...) — the
  // plain slug is used when free, and only suffixed with the state when a
  // different suburb already holds it, so existing single-state slugs stay
  // untouched.
  const baseSlug = slugify(name);
  const existing = await prisma.suburb.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${state.toLowerCase()}` : baseSlug;

  const suburb = await prisma.suburb.create({
    data: { name, postcode, state, region, slug },
  });

  return NextResponse.json({ suburb }, { status: 201 });
}
