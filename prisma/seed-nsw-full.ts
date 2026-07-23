// Loads the full NSW postcode/locality set beyond the hand-curated Sydney
// metro list in prisma/seed-metro-suburbs.ts — so posting a special never
// hits "suburb doesn't exist" for anywhere in NSW, not just Sydney.
//
// Sourced from matthewproctor/australianpostcodes (public domain,
// https://github.com/matthewproctor/australianpostcodes), filtered to NSW
// "Delivery Area" entries (real localities, excluding PO-box/large-volume-
// receiver codes), deduplicated by name, and already excludes anything
// that collides with an existing curated entry — see prisma/nsw-suburbs-full.json.
//
// Region is bucketed from the source's official ABS SA4 classification:
// real Sydney SA4s map onto the existing Central/North/East/South/West
// scheme (matching prisma/seed-metro-suburbs.ts's boundaries), everything
// else (the vast majority — regional/rural NSW) is "Regional NSW".
//
// Run with: npx tsx prisma/seed-nsw-full.ts
// Uses the same idempotent upsert-by-slug pattern as the other seed
// scripts, so it's safe to re-run.

import { PrismaClient } from "@prisma/client";
import suburbs from "./nsw-suburbs-full.json";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.suburb.count({ where: { state: "NSW" } });
  for (const s of suburbs as { slug: string; name: string; postcode: string; region: string }[]) {
    await prisma.suburb.upsert({
      where: { slug: s.slug },
      update: {},
      create: { slug: s.slug, name: s.name, postcode: s.postcode, region: s.region, state: "NSW" },
    });
  }
  const after = await prisma.suburb.count({ where: { state: "NSW" } });
  console.log(`Done — ${suburbs.length} entries processed, ${after - before} newly created (${before} -> ${after} NSW suburbs).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
