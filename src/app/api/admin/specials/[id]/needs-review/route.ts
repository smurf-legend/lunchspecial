import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const needsReviewSchema = z.object({
  needsReview: z.boolean(),
  needsReviewNote: z.string().max(500).optional(),
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
  const parsed = needsReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const special = await prisma.special.update({
    where: { id: params.id },
    data: {
      needsReview: parsed.data.needsReview,
      needsReviewNote: parsed.data.needsReview ? parsed.data.needsReviewNote ?? null : null,
    },
  });

  return NextResponse.json({ special });
}
