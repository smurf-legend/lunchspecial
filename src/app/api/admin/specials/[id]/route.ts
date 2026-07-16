import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const specialUpdateSchema = z
  .object({
    title: z.string().min(5).max(200),
    description: z.string().min(10),
    venueName: z.string().min(1),
    address: z.string().optional().nullable(),
    url: z.string().url().optional().nullable().or(z.literal("")),
    imageUrl: z.string().url().optional().nullable().or(z.literal("")),
    extraImageUrls: z.array(z.string().url()).optional(),
    couponCode: z.string().optional().nullable(),
    usualPrice: z.number().optional().nullable(),
    specialPrice: z.number(),
    availableDays: z.string().optional(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    expiresAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
    suburbSlugs: z.array(z.string()),
    chainWide: z.boolean().optional().default(false),
    greatValue: z.boolean().optional().default(false),
    categorySlugs: z.array(z.string()).optional(),
  })
  .refine((data) => data.chainWide || data.suburbSlugs.length > 0, {
    message: "Select at least one suburb, or mark this as a nationwide chain",
    path: ["suburbSlugs"],
  });

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
