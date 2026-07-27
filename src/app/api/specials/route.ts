import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findDuplicateSpecials } from "@/lib/duplicateCheck";
import { noProfanity, profanityMessage } from "@/lib/profanity";
import { sendNewSpecialEmail } from "@/lib/mail";
import { z } from "zod";

const specialSchema = z
  .object({
    title: z.string().min(5).max(60).refine(noProfanity, profanityMessage("Title")),
    description: z.string().min(10).refine(noProfanity, profanityMessage("Description")),
    venueName: z.string().min(1),
    address: z.string().optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    extraImageUrls: z.array(z.string().url()).optional(),
    couponCode: z.string().optional(),
    usualPrice: z.number().optional(),
    specialPrice: z.number().optional(),
    discountPercent: z.number().int().min(1).max(100).optional(),
    priceRangeMin: z.number().optional(),
    priceRangeMax: z.number().optional(),
    availableDays: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    expiresAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
    suburbSlugs: z.array(z.string()),
    chainWide: z.boolean().optional().default(false),
    greatValue: z.boolean().optional().default(false),
    membersOnly: z.boolean().optional().default(false),
    deliveryAvailable: z.boolean().optional().default(false),
    categorySlugs: z.array(z.string()).optional(),
    confirmDuplicate: z.boolean().optional(),
  })
  .refine((data) => data.chainWide || data.suburbSlugs.length > 0, {
    message: "Select at least one suburb, or mark this as a nationwide chain",
    path: ["suburbSlugs"],
  })
  .refine(
    (data) => data.specialPrice != null || data.discountPercent != null || (data.priceRangeMin != null && data.priceRangeMax != null),
    {
      message: "Enter a special price, a percentage discount, or a price range",
      path: ["specialPrice"],
    }
  )
  .refine((data) => data.priceRangeMin == null || data.priceRangeMax == null || data.priceRangeMax > data.priceRangeMin, {
    message: "The high end of the price range must be more than the low end",
    path: ["priceRangeMax"],
  });

// GET /api/specials?sort=hot|new&suburb=slug&location=suburbName|postcode&category=slug&q=search&page=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "hot";
  const suburb = searchParams.get("suburb");
  const location = searchParams.get("location")?.trim();
  const isPostcode = !!location && /^\d{4}$/.test(location);
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 20;

  const and: any[] = [];
  if (suburb) {
    and.push({ OR: [{ suburbs: { some: { suburb: { slug: suburb } } } }, { chainWide: true }] });
  }
  if (location) {
    and.push({
      OR: [
        {
          suburbs: {
            some: {
              suburb: isPostcode ? { postcode: location } : { name: { contains: location, mode: "insensitive" } },
            },
          },
        },
        { chainWide: true },
      ],
    });
  }
  if (category) and.push({ categories: { some: { category: { slug: category } } } });
  if (q) {
    // unaccent() so "me banh me" matches "Mê Bánh Mì" — plain `contains` is
    // diacritic-sensitive and would miss it.
    const pattern = `%${q}%`;
    const matches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Special"
      WHERE unaccent(title) ILIKE unaccent(${pattern})
         OR unaccent(description) ILIKE unaccent(${pattern})
         OR unaccent("venueName") ILIKE unaccent(${pattern})
    `;
    and.push({ id: { in: matches.map((m) => m.id) } });
  }
  const where: any = and.length > 0 ? { AND: and } : {};

  const specials = await prisma.special.findMany({
    where,
    orderBy: sort === "new" ? { createdAt: "desc" } : { score: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      author: { select: { id: true, name: true } },
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ specials, page, pageSize });
}

// POST /api/specials — create a new lunch special (requires auth)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = specialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { categorySlugs, suburbSlugs, confirmDuplicate, ...data } = parsed.data;

  const suburbs = await prisma.suburb.findMany({ where: { slug: { in: suburbSlugs } } });
  if (suburbs.length !== suburbSlugs.length) {
    return NextResponse.json({ error: "Unknown suburb" }, { status: 400 });
  }

  if (!confirmDuplicate) {
    const duplicates = await findDuplicateSpecials({
      venueName: data.venueName,
      suburbSlugs,
      specialPrice: data.specialPrice,
      discountPercent: data.discountPercent,
      title: data.title,
      chainWide: data.chainWide,
    });
    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          duplicates: duplicates.map((d) => ({
            id: d.id,
            title: d.title,
            specialPrice: d.specialPrice,
            discountPercent: d.discountPercent,
            priceRangeMin: d.priceRangeMin,
            priceRangeMax: d.priceRangeMax,
            venueName: d.venueName,
            suburbNames: d.suburbs.map((s) => s.suburb.name),
          })),
        },
        { status: 409 }
      );
    }
  }

  const special = await prisma.special.create({
    data: {
      ...data,
      authorId: (session.user as any).id,
      suburbs: {
        create: suburbs.map((s) => ({ suburb: { connect: { id: s.id } } })),
      },
      categories: categorySlugs
        ? {
            create: categorySlugs.map((slug) => ({
              category: { connect: { slug } },
            })),
          }
        : undefined,
    },
  });

  await sendNewSpecialEmail({
    id: special.id,
    title: special.title,
    venueName: special.venueName,
    authorName: session.user.name ?? "a user",
  });

  return NextResponse.json({ special }, { status: 201 });
}
