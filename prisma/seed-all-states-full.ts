// Loads the full postcode/locality set for every state beyond NSW's
// existing full coverage (prisma/seed-nsw-full.ts) — VIC previously only
// had the 95 hand-curated Melbourne metro suburbs
// (prisma/seed-vic-metro-suburbs.ts); QLD/WA/SA/TAS/NT/ACT had none at all.
//
// Sourced from matthewproctor/australianpostcodes (public domain,
// https://github.com/matthewproctor/australianpostcodes), filtered to each
// state's "Delivery Area" entries (real localities, excluding PO-box/
// large-volume-receiver codes), deduplicated by name within each state, and
// already excludes anything colliding with an existing curated slug — see
// prisma/{state}-suburbs-full.json (state = vic, qld, wa, sa, tas, nt, act).
//
// Region is bucketed from the source's ABS SA4 name: real capital-city SA4s
// (e.g. "Brisbane Inner City", "Perth - Inner") are kept as-is since they're
// already a genuine, human-readable regional label; everything else
// (regional/rural) collapses to "Regional {STATE}", matching the NSW script's
// own precedent.
//
// Run with: npx tsx prisma/seed-all-states-full.ts
// Uses the same idempotent upsert-by-slug pattern as the other seed scripts.

import { PrismaClient } from "@prisma/client";
import vic from "./vic-suburbs-full.json";
import qld from "./qld-suburbs-full.json";
import wa from "./wa-suburbs-full.json";
import sa from "./sa-suburbs-full.json";
import tas from "./tas-suburbs-full.json";
import nt from "./nt-suburbs-full.json";
import act from "./act-suburbs-full.json";

const prisma = new PrismaClient();

type Entry = { slug: string; name: string; postcode: string; region: string };

const STATES: { code: string; entries: Entry[] }[] = [
  { code: "VIC", entries: vic as Entry[] },
  { code: "QLD", entries: qld as Entry[] },
  { code: "WA", entries: wa as Entry[] },
  { code: "SA", entries: sa as Entry[] },
  { code: "TAS", entries: tas as Entry[] },
  { code: "NT", entries: nt as Entry[] },
  { code: "ACT", entries: act as Entry[] },
];

async function main() {
  for (const { code, entries } of STATES) {
    const before = await prisma.suburb.count({ where: { state: code } });
    for (const s of entries) {
      await prisma.suburb.upsert({
        where: { slug: s.slug },
        update: {},
        create: { slug: s.slug, name: s.name, postcode: s.postcode, region: s.region, state: code },
      });
    }
    const after = await prisma.suburb.count({ where: { state: code } });
    console.log(`${code}: ${entries.length} entries processed, ${after - before} newly created (${before} -> ${after}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
