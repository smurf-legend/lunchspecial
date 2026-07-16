import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(40),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// POST /api/categories — any logged-in poster can add a new cuisine/category
// tag on the fly (e.g. while posting a special), not just admins.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
  }

  // If it already exists (e.g. someone else just added the same one),
  // just return it rather than erroring — smoother for concurrent posters.
  const category = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name: name.trim(), slug },
  });

  return NextResponse.json({ category }, { status: 201 });
}
