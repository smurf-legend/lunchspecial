// Bulk-imports specials from a JSON file — built so a local LLM can produce
// the research data and this script safely gets it into the database with
// validation and duplicate detection, instead of hand-writing seed files.
//
// Usage:
//   npx tsx prisma/import-specials.ts path/to/specials.json --dry-run
//   npx tsx prisma/import-specials.ts path/to/specials.json
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import { z } from "zod";

const prisma = new PrismaClient();

const specialImportSchema = z
  .object({
    title: z.string().min(5).max(200),
    description: z.string().min(10),
    venueName: z.string().min(1),
    address: z.string().optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    usualPrice: z.number().optional(),
    specialPrice: z.number(),
    availableDays: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    suburbSlugs: z.array(z.string()).optional().default([]),
    chainWide: z.boolean().optional().default(false),
    categorySlugs: z.array(z.string()).min(1),
    couponCode: z.string().optional(),
    greatValue: z.boolean().optional().default(false),
  })
  .refine((d) => d.chainWide || d.suburbSlugs.length > 0, {
    message: "must have at least one suburbSlug, or chainWide: true",
  });

type ParsedSpecial = z.infer<typeof specialImportSchema>;

// Same "same venue + same suburb + (same price OR same title)" rule used by
// the live posting form's duplicate check (src/lib/duplicateCheck.ts) —
// reimplemented here rather than imported, since this script runs standalone
// via tsx and shouldn't depend on the Next.js `@/` path alias resolving.
async function findDuplicates(s: ParsedSpecial) {
  const candidates = await prisma.special.findMany({
    where: {
      venueName: { equals: s.venueName.trim(), mode: "insensitive" },
      ...(s.chainWide ? {} : { suburbs: { some: { suburb: { slug: { in: s.suburbSlugs } } } } }),
    },
  });
  const normalizedTitle = s.title.trim().toLowerCase();
  return candidates.filter(
    (c) => c.specialPrice === s.specialPrice || c.title.trim().toLowerCase() === normalizedTitle
  );
}

async function main() {
  const filePath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-specials.ts <file.json> [--dry-run]");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(raw)) {
    console.error("Expected the JSON file to contain an array of specials.");
    process.exit(1);
  }

  const parsed: ParsedSpecial[] = [];
  const validationErrors: string[] = [];
  raw.forEach((entry, i) => {
    const result = specialImportSchema.safeParse(entry);
    if (!result.success) {
      validationErrors.push(
        `Entry ${i} (${entry?.title ?? "untitled"}): ${result.error.issues.map((e) => e.message).join("; ")}`
      );
    } else {
      parsed.push(result.data);
    }
  });

  if (validationErrors.length > 0) {
    console.error(`${validationErrors.length} entr${validationErrors.length === 1 ? "y" : "ies"} failed validation:`);
    validationErrors.forEach((e) => console.error(`  - ${e}`));
  }

  const allSuburbSlugs = [...new Set(parsed.flatMap((s) => s.suburbSlugs))];
  const allCategorySlugs = [...new Set(parsed.flatMap((s) => s.categorySlugs))];

  const [validSuburbs, validCategories] = await Promise.all([
    prisma.suburb.findMany({ where: { slug: { in: allSuburbSlugs } }, select: { id: true, slug: true } }),
    prisma.category.findMany({ where: { slug: { in: allCategorySlugs } }, select: { id: true, slug: true } }),
  ]);

  const suburbMap = new Map(validSuburbs.map((s) => [s.slug, s.id]));
  const categoryMap = new Map(validCategories.map((c) => [c.slug, c.id]));

  const missingSuburbs = allSuburbSlugs.filter((s) => !suburbMap.has(s));
  const missingCategories = allCategorySlugs.filter((c) => !categoryMap.has(c));

  if (missingSuburbs.length > 0) console.error(`Unknown suburb slugs: ${missingSuburbs.join(", ")}`);
  if (missingCategories.length > 0) console.error(`Unknown category slugs: ${missingCategories.join(", ")}`);

  const usable = parsed.filter(
    (s) =>
      (s.chainWide || s.suburbSlugs.every((slug) => suburbMap.has(slug))) &&
      s.categorySlugs.every((slug) => categoryMap.has(slug))
  );

  if (dryRun) {
    console.log(
      `Dry run: ${usable.length}/${raw.length} entries are valid and ready to import ` +
        `(${validationErrors.length} failed validation, ${raw.length - validationErrors.length - usable.length} reference unknown suburb/category slugs).`
    );
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const author = await prisma.user.upsert({
    where: { email: "team@lunchspecial.com.au" },
    update: {},
    create: { name: "LunchSpecial Team", email: "team@lunchspecial.com.au", passwordHash, role: "admin" },
  });

  let created = 0;
  let skippedDuplicate = 0;

  for (const s of usable) {
    const duplicates = await findDuplicates(s);
    if (duplicates.length > 0) {
      console.log(`Skipping likely duplicate: "${s.title}" at ${s.venueName}`);
      skippedDuplicate++;
      continue;
    }

    await prisma.special.create({
      data: {
        title: s.title,
        description: s.description,
        venueName: s.venueName,
        address: s.address,
        url: s.url,
        imageUrl: s.imageUrl,
        specialPrice: s.specialPrice,
        usualPrice: s.usualPrice,
        availableDays: s.availableDays ?? "Mon,Tue,Wed,Thu,Fri",
        startTime: s.startTime,
        endTime: s.endTime,
        couponCode: s.couponCode,
        greatValue: s.greatValue,
        chainWide: s.chainWide,
        authorId: author.id,
        suburbs: {
          create: s.suburbSlugs.map((slug) => ({ suburb: { connect: { id: suburbMap.get(slug)! } } })),
        },
        categories: {
          create: s.categorySlugs.map((slug) => ({ category: { connect: { id: categoryMap.get(slug)! } } })),
        },
      },
    });
    created++;
  }

  console.log(
    `Done. Created ${created}, skipped ${skippedDuplicate} likely duplicate${skippedDuplicate === 1 ? "" : "s"}, ` +
      `${raw.length - usable.length} entries were invalid or referenced unknown slugs.`
  );
}

main().finally(() => prisma.$disconnect());
