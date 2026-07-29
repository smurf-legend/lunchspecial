import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { specialUpdateSchema } from "@/lib/specialUpdateSchema";
import { resolveVideoUrls } from "@/lib/resolveVideoUrls";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const special = await prisma.special.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true } },
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true } },
          replies: { include: { author: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!special) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ special });
}

// A special can be edited/deleted here by its own author, or by an admin
// (admins also have a separate /api/admin/specials/[id] route used from the
// kitchen, which additionally manages moderation fields like hidden/needsReview).
async function requireOwnerOrAdmin(specialId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const special = await prisma.special.findUnique({ where: { id: specialId }, select: { authorId: true } });
  if (!special) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (special.authorId !== userId && role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { error: null } as const;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwnerOrAdmin(params.id);
  if (auth.error) return auth.error;

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
      videoUrls: data.videoUrls ? await resolveVideoUrls(data.videoUrls) : data.videoUrls,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwnerOrAdmin(params.id);
  if (auth.error) return auth.error;

  await prisma.special.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
