import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const suburbSchema = z.object({
  name: z.string().min(1).max(60),
  postcode: z.string().regex(/^\d{4}$/, "Postcode must be 4 digits"),
  state: z.string().min(2).max(3),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// POST /api/suburbs — any logged-in poster can add a missing suburb on the
// fly (e.g. while posting a special), not just admins. Mirrors /api/categories.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = suburbSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, postcode, state } = parsed.data;

  // Suburb names repeat across states (Richmond, Windsor, Kingston...) — the
  // plain slug is used when free, and only suffixed with the state when a
  // different suburb already holds it, so existing single-state slugs stay
  // untouched.
  const baseSlug = slugify(name);
  if (!baseSlug) {
    return NextResponse.json({ error: "Invalid suburb name" }, { status: 400 });
  }
  const existingBase = await prisma.suburb.findUnique({ where: { slug: baseSlug } });
  const slug = existingBase && existingBase.state !== state.toUpperCase() ? `${baseSlug}-${state.toLowerCase()}` : baseSlug;

  // If it already exists (e.g. someone else just added the same one),
  // just return it rather than erroring — smoother for concurrent posters.
  // No region input from the poster — "region" is only used for browsing
  // pages (/regions/[state]/[region]), not anything they see here, so a
  // suburb they add ad hoc just lands in a catch-all bucket for that state.
  const suburb = await prisma.suburb.upsert({
    where: { slug },
    update: {},
    create: { name: name.trim(), postcode, state: state.toUpperCase(), region: "Other", slug },
  });

  return NextResponse.json({ suburb }, { status: 201 });
}
