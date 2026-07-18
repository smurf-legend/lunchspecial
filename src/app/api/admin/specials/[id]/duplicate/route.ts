import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

// POST /api/admin/specials/[id]/duplicate — for same-venue, different-day
// deals (e.g. a pub with a different $15 special each day of the week).
// Copies everything except votes/comments/score, which start fresh, so the
// admin only has to change the title/description/day for the new post
// instead of re-entering venue, address, image, price, etc.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const source = await prisma.special.findUnique({
    where: { id: params.id },
    include: { suburbs: true, categories: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Special not found" }, { status: 404 });
  }

  const duplicate = await prisma.special.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      venueName: source.venueName,
      address: source.address,
      url: source.url,
      imageUrl: source.imageUrl,
      extraImageUrls: source.extraImageUrls,
      couponCode: source.couponCode,
      usualPrice: source.usualPrice,
      specialPrice: source.specialPrice,
      discountPercent: source.discountPercent,
      availableDays: source.availableDays,
      startTime: source.startTime,
      endTime: source.endTime,
      expiresAt: source.expiresAt,
      chainWide: source.chainWide,
      greatValue: source.greatValue,
      authorId: (session.user as any).id,
      suburbs: {
        create: source.suburbs.map((s) => ({ suburb: { connect: { id: s.suburbId } } })),
      },
      categories: {
        create: source.categories.map((c) => ({ category: { connect: { id: c.categoryId } } })),
      },
    },
  });

  return NextResponse.json({ special: duplicate }, { status: 201 });
}
