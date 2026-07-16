// Expands suburb reference data beyond the initial 10 seeded in prisma/seed.ts.
// Sourced from Australia Post postcode lookups / Wikipedia lists of Sydney
// suburbs by region (Inner West, Northern Sydney, Northern Beaches, Eastern
// Suburbs, St George, Sutherland Shire, Greater Western Sydney, Hills
// District, Canterbury-Bankstown, Macarthur). Real names/postcodes — this is
// factual public reference data, not generated content.
//
// Run with: npx tsx prisma/seed-metro-suburbs.ts
//
// Uses the same idempotent upsert-by-slug pattern as prisma/seed.ts, so it's
// safe to re-run and safe to run alongside the existing seed script.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Central = inner city / inner west
const CENTRAL = [
  { name: "Ultimo", postcode: "2007" },
  { name: "Pyrmont", postcode: "2009" },
  { name: "Darlinghurst", postcode: "2010" },
  { name: "Paddington", postcode: "2021" },
  { name: "Waterloo", postcode: "2017" },
  { name: "Alexandria", postcode: "2015" },
  { name: "Erskineville", postcode: "2043" },
  { name: "St Peters", postcode: "2044" },
  { name: "Camperdown", postcode: "2050" },
  { name: "Glebe", postcode: "2037" },
  { name: "Annandale", postcode: "2038" },
  { name: "Leichhardt", postcode: "2040" },
  { name: "Balmain", postcode: "2041" },
  { name: "Rozelle", postcode: "2039" },
  { name: "Petersham", postcode: "2049" },
  { name: "Stanmore", postcode: "2048" },
  { name: "Dulwich Hill", postcode: "2203" },
  { name: "Summer Hill", postcode: "2130" },
  { name: "Ashfield", postcode: "2131" },
  { name: "Haberfield", postcode: "2045" },
  { name: "Five Dock", postcode: "2046" },
  { name: "Drummoyne", postcode: "2047" },
  { name: "Burwood", postcode: "2134" },
  { name: "Strathfield", postcode: "2135" },
  { name: "Homebush", postcode: "2140" },
  { name: "Tempe", postcode: "2044" },
];

// North = north shore / northern beaches
const NORTH = [
  { name: "Mosman", postcode: "2088" },
  { name: "Neutral Bay", postcode: "2089" },
  { name: "Cremorne", postcode: "2090" },
  { name: "North Sydney", postcode: "2060" },
  { name: "Crows Nest", postcode: "2065" },
  { name: "Lane Cove", postcode: "2066" },
  { name: "Willoughby", postcode: "2068" },
  { name: "Lindfield", postcode: "2070" },
  { name: "Killara", postcode: "2071" },
  { name: "Gordon", postcode: "2072" },
  { name: "Pymble", postcode: "2073" },
  { name: "Turramurra", postcode: "2074" },
  { name: "Wahroonga", postcode: "2076" },
  { name: "Hornsby", postcode: "2077" },
  { name: "Pennant Hills", postcode: "2120" },
  { name: "Cherrybrook", postcode: "2126" },
  { name: "St Ives", postcode: "2075" },
  { name: "Belrose", postcode: "2085" },
  { name: "Frenchs Forest", postcode: "2086" },
  { name: "Forestville", postcode: "2087" },
  { name: "Balgowlah", postcode: "2093" },
  { name: "Brookvale", postcode: "2100" },
  { name: "Dee Why", postcode: "2099" },
  { name: "Collaroy", postcode: "2097" },
  { name: "Narrabeen", postcode: "2101" },
  { name: "Mona Vale", postcode: "2103" },
  { name: "Avalon Beach", postcode: "2107" },
  { name: "Palm Beach", postcode: "2108" },
];

// East = eastern suburbs
const EAST = [
  { name: "Woollahra", postcode: "2025" },
  { name: "Double Bay", postcode: "2028" },
  { name: "Rose Bay", postcode: "2029" },
  { name: "Vaucluse", postcode: "2030" },
  { name: "Watsons Bay", postcode: "2030" },
  { name: "Dover Heights", postcode: "2030" },
  { name: "Bellevue Hill", postcode: "2023" },
  { name: "Bronte", postcode: "2024" },
  { name: "Tamarama", postcode: "2026" },
  { name: "Clovelly", postcode: "2031" },
  { name: "Coogee", postcode: "2034" },
  { name: "Randwick", postcode: "2031" },
  { name: "Kensington", postcode: "2033" },
  { name: "Kingsford", postcode: "2032" },
  { name: "Maroubra", postcode: "2035" },
  { name: "Malabar", postcode: "2036" },
  { name: "Matraville", postcode: "2036" },
  { name: "La Perouse", postcode: "2036" },
  { name: "North Bondi", postcode: "2026" },
  { name: "Bondi Beach", postcode: "2026" },
  { name: "Bondi Junction", postcode: "2022" },
  { name: "Queens Park", postcode: "2022" },
  { name: "Centennial Park", postcode: "2021" },
  { name: "Waverley", postcode: "2024" },
  { name: "Edgecliff", postcode: "2027" },
  { name: "Point Piper", postcode: "2027" },
];

// South = St George / Sutherland Shire / southern suburbs
const SOUTH = [
  { name: "Hurstville", postcode: "2220" },
  { name: "Kogarah", postcode: "2217" },
  { name: "Rockdale", postcode: "2216" },
  { name: "Brighton-Le-Sands", postcode: "2216" },
  { name: "Sans Souci", postcode: "2219" },
  { name: "Sutherland", postcode: "2232" },
  { name: "Cronulla", postcode: "2230" },
  { name: "Miranda", postcode: "2228" },
  { name: "Caringbah", postcode: "2229" },
  { name: "Sylvania", postcode: "2224" },
  { name: "Gymea", postcode: "2227" },
  { name: "Menai", postcode: "2234" },
  { name: "Engadine", postcode: "2233" },
  { name: "Oatley", postcode: "2223" },
  { name: "Mortdale", postcode: "2223" },
  { name: "Penshurst", postcode: "2222" },
  { name: "Peakhurst", postcode: "2210" },
  { name: "Bexley", postcode: "2207" },
  { name: "Kingsgrove", postcode: "2208" },
  { name: "Beverly Hills", postcode: "2209" },
  { name: "Riverwood", postcode: "2210" },
  { name: "Bankstown", postcode: "2200" },
  { name: "Arncliffe", postcode: "2205" },
  { name: "Blakehurst", postcode: "2221" },
  { name: "South Hurstville", postcode: "2221" },
  { name: "Como", postcode: "2226" },
  { name: "Jannali", postcode: "2226" },
  { name: "Kirrawee", postcode: "2232" },
];

// West = Greater Western Sydney
const WEST = [
  { name: "Blacktown", postcode: "2148" },
  { name: "Mount Druitt", postcode: "2770" },
  { name: "Penrith", postcode: "2750" },
  { name: "St Marys", postcode: "2760" },
  { name: "Liverpool", postcode: "2170" },
  { name: "Fairfield", postcode: "2165" },
  { name: "Cabramatta", postcode: "2166" },
  { name: "Auburn", postcode: "2144" },
  { name: "Granville", postcode: "2142" },
  { name: "Merrylands", postcode: "2160" },
  { name: "Guildford", postcode: "2161" },
  { name: "Wentworthville", postcode: "2145" },
  { name: "Toongabbie", postcode: "2146" },
  { name: "Seven Hills", postcode: "2147" },
  { name: "Baulkham Hills", postcode: "2153" },
  { name: "Castle Hill", postcode: "2154" },
  { name: "Rouse Hill", postcode: "2155" },
  { name: "Kellyville", postcode: "2155" },
  { name: "Quakers Hill", postcode: "2763" },
  { name: "Epping", postcode: "2121" },
  { name: "Eastwood", postcode: "2122" },
  { name: "Carlingford", postcode: "2118" },
  { name: "Ryde", postcode: "2112" },
  { name: "Macquarie Park", postcode: "2113" },
  { name: "Smithfield", postcode: "2164" },
  { name: "Casula", postcode: "2170" },
  { name: "Ingleburn", postcode: "2565" },
  { name: "Campbelltown", postcode: "2560" },
];

const METRO_SUBURBS = [
  ...CENTRAL.map((s) => ({ ...s, region: "Central" })),
  ...NORTH.map((s) => ({ ...s, region: "North" })),
  ...EAST.map((s) => ({ ...s, region: "East" })),
  ...SOUTH.map((s) => ({ ...s, region: "South" })),
  ...WEST.map((s) => ({ ...s, region: "West" })),
];

async function main() {
  let created = 0;
  for (const s of METRO_SUBURBS) {
    await prisma.suburb.upsert({
      where: { slug: slugify(s.name) },
      update: {},
      create: { name: s.name, postcode: s.postcode, state: "NSW", region: s.region, slug: slugify(s.name) },
    });
    created++;
  }

  console.log(`Metro suburb seed complete. Upserted ${created} suburbs.`);
}

main().finally(() => prisma.$disconnect());
