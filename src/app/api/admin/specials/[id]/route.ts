import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { specialUpdateSchema } from "@/lib/specialUpdateSchema";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await prisma.special.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = specialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { categorySlugs, suburbSlugs, url, imageUrl, couponCode, ...data } = parsed.data;

  const suburbs = await prisma.suburb.findMany({ where: { slug: { in: suburbSlugs } } });
  if (suburbs.length !== suburbSlugs.length) {
    return NextResponse.json({ error: "Unknown suburb" }, { status: 400 });
  }

  const special = await prisma.special.update({
    where: { id: params.id },
    data: {
      ...data,
      url: url || null,
      imageUrl: imageUrl || null,
      couponCode: couponCode || null,
      suburbs: {
        deleteMany: {},
        create: suburbs.map((s) => ({ suburb: { connect: { id: s.id } } })),
      },
      categories: categorySlugs
        ? {
            deleteMany: {},
            create: categorySlugs.map((slug) => ({
              category: { connect: { slug } },
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ special });
}
