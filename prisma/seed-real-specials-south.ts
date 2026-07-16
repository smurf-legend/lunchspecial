// Real, currently-advertised lunch specials for LunchSpecial's South-region
// Sydney coverage (St George / Sutherland Shire / Canterbury-Bankstown area).
// Researched via web search in July 2026. Every entry is backed by a real
// venue and a source URL — see `url` on each row. Descriptions are written
// in our own words, not copied from source marketing copy. Prices are taken
// directly from venue websites, official social pages, or specific menu/
// review mentions found during research; nothing here is invented.
//
// Coverage note: many South-region suburbs were searched thoroughly but
// turned up no concrete, currently-advertised lunch special with a real
// price attached (as opposed to vague "daily specials available" copy) —
// those suburbs are intentionally omitted rather than padded with guesses.
// Suburbs with zero entries here: Arncliffe, Beverly Hills, Blakehurst,
// Brighton-Le-Sands, Jannali, Oatley, Peakhurst, Penshurst, Riverwood,
// Rockdale, Sans Souci, South Hurstville.
//
// This script is additive and safe to re-run in the sense that it doesn't
// touch existing data, but it has no upsert key on Special, so re-running
// it will duplicate rows — run once.
//
// Run with: npx tsx prisma/seed-real-specials-south.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SpecialSeed = {
  title: string;
  description: string;
  venueName: string;
  address?: string;
  url?: string;
  usualPrice?: number;
  specialPrice: number;
  availableDays?: string;
  startTime?: string;
  endTime?: string;
  suburbSlug: string;
  categorySlug: string;
};

const SPECIALS: SpecialSeed[] = [
  // ---------------- Bankstown ----------------
  {
    title: "$14.90 chicken schnitzel lunch",
    description:
      "Crumbed chicken schnitzel served with chips, salad and a choice of sauce, part of Greenfield Station Bistro's midweek specials board inside Bankstown Sports Club.",
    venueName: "Greenfield Station Bistro (Bankstown Sports Club)",
    address: "8 Greenfield Pde, Bankstown NSW 2200",
    url: "https://www.bankstownsports.com/greenfield-station-bistro",
    specialPrice: 14.9,
    availableDays: "Wed",
    suburbSlug: "bankstown",
    categorySlug: "pub-food",
  },
  {
    title: "$19.90 rump steak lunch",
    description:
      "A 200g rump steak with chips, salad and a choice of sauce, one of the railway-themed bistro's weekly meal deals at Bankstown Sports Club.",
    venueName: "Greenfield Station Bistro (Bankstown Sports Club)",
    address: "8 Greenfield Pde, Bankstown NSW 2200",
    url: "https://www.bankstownsports.com/greenfield-station-bistro",
    specialPrice: 19.9,
    availableDays: "Thu",
    suburbSlug: "bankstown",
    categorySlug: "pub-food",
  },

  // ---------------- Bexley ----------------
  {
    title: "$10 steak special",
    description:
      "A budget rump steak meal on the Bexley North Hotel's everyday value menu, a short drive from Bexley proper.",
    venueName: "Bexley North Hotel",
    address: "187 Slade Rd, Bexley North NSW 2207",
    url: "https://www.bexleynorthhotel.com.au/",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "bexley",
    categorySlug: "pub-food",
  },

  // ---------------- Caringbah ----------------
  {
    title: "$17 chicken schnitzel",
    description:
      "Crumbed chicken schnitzel from the Caringbah Hotel's everyday $17 pub-classics lineup, served with a choice of sides.",
    venueName: "Caringbah Hotel",
    address: "343 Port Hacking Rd, Caringbah NSW 2229",
    url: "https://www.caringbahhotel.com.au/dining",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "caringbah",
    categorySlug: "pub-food",
  },
  {
    title: "$17 250g rump steak",
    description:
      "A 250g rump steak, also part of the Caringbah Hotel's everyday $17 pub-classics range alongside schnitzel, fish and chips and burgers.",
    venueName: "Caringbah Hotel",
    address: "343 Port Hacking Rd, Caringbah NSW 2229",
    url: "https://www.caringbahhotel.com.au/dining",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "caringbah",
    categorySlug: "pub-food",
  },

  // ---------------- Como ----------------
  {
    title: "$17 Tuesday schnitzel",
    description:
      "All-day schnitzel deal at the Como Hotel every Tuesday, a long-running fixture of the pub's weekly specials.",
    venueName: "Como Hotel",
    address: "35 Cremona Rd, Como NSW 2226",
    url: "https://thecomo.com.au/",
    specialPrice: 17,
    availableDays: "Tue",
    suburbSlug: "como",
    categorySlug: "pub-food",
  },
  {
    title: "$18 weekday lunch special",
    description:
      "Chef's rotating lunch special (check the specials board on the day) at the Como Hotel, running Monday to Thursday.",
    venueName: "Como Hotel",
    address: "35 Cremona Rd, Como NSW 2226",
    url: "https://thecomo.com.au/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu",
    suburbSlug: "como",
    categorySlug: "pub-food",
  },

  // ---------------- Cronulla ----------------
  {
    title: "$17 burger of the day",
    description:
      "A rotating chef's special burger with fries, available all day every Monday at Northies Cronulla Hotel.",
    venueName: "Northies Cronulla Hotel",
    address: "Kingsway & Elouera Rd, Cronulla NSW 2230",
    url: "https://northies.com.au/whats-on/weekly-food-specials",
    specialPrice: 17,
    availableDays: "Mon",
    suburbSlug: "cronulla",
    categorySlug: "pub-food",
  },
  {
    title: "$20 rump steak night",
    description:
      "Rump steak with chips and salad, the entry tier of Northies Cronulla Hotel's Thursday steak special (T-bone and sirloin also available at higher prices).",
    venueName: "Northies Cronulla Hotel",
    address: "Kingsway & Elouera Rd, Cronulla NSW 2230",
    url: "https://northies.com.au/whats-on/weekly-food-specials",
    specialPrice: 20,
    availableDays: "Thu",
    suburbSlug: "cronulla",
    categorySlug: "pub-food",
  },

  // ---------------- Engadine ----------------
  {
    title: "$15 burger or pizza lunch",
    description:
      "Discounted burger or pizza on the Engadine Tavern's weekday lunch specials board.",
    venueName: "Engadine Tavern",
    address: "50 Station St, Engadine NSW 2233",
    url: "https://www.engadinetavern.com.au/eat-drink/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "engadine",
    categorySlug: "pub-food",
  },
  {
    title: "$18 steak or schnitzel lunch",
    description:
      "Steak or chicken schnitzel at a discounted weekday price, part of the same lunch specials programme at Engadine Tavern.",
    venueName: "Engadine Tavern",
    address: "50 Station St, Engadine NSW 2233",
    url: "https://www.engadinetavern.com.au/eat-drink/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "engadine",
    categorySlug: "pub-food",
  },

  // ---------------- Gymea ----------------
  {
    title: "$55 three-course lunch",
    description:
      "A three-course set lunch at FIOR with a choice from five entrees, six mains and three desserts of Italian-Australian comfort food; the same menu also runs as a Tuesday-Thursday dinner.",
    venueName: "FIOR Restaurant",
    url: "http://www.fiorrestaurant.com.au/weekday-eats",
    specialPrice: 55,
    availableDays: "Fri",
    suburbSlug: "gymea",
    categorySlug: "italian",
  },

  // ---------------- Hurstville ----------------
  {
    title: "$20 lunch special (4 choices)",
    description:
      "Choice of chicken schnitzel, burger, linguine or caesar salad for a flat $20 at Humphrey's Hotel's lunch service.",
    venueName: "Humphrey's Hotel",
    address: "Level 1/288 Forest Rd, Hurstville NSW 2220",
    url: "https://humphreyshotel.com.au/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "hurstville",
    categorySlug: "pub-food",
  },

  // ---------------- Kingsgrove ----------------
  {
    title: "$18 lunch special",
    description:
      "Classic pub lunch — steak, burgers or schnitzel — for $18 at the Kingsgrove Hotel, right across from Kingsgrove station.",
    venueName: "Kingsgrove Hotel",
    address: "236 Kingsgrove Rd, Kingsgrove NSW 2208",
    url: "https://kingsgrovehotel.com.au/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "kingsgrove",
    categorySlug: "pub-food",
  },

  // ---------------- Kirrawee ----------------
  {
    title: "$17 Wednesday schnitzel",
    description:
      "Chicken schnitzel with chips, salad and gravy every Wednesday at Club Kirrawee's Club Grill bistro.",
    venueName: "Club Kirrawee",
    address: "Oak Rd, Kirrawee NSW 2232",
    url: "https://clubkirrawee.com.au/food/",
    specialPrice: 17,
    availableDays: "Wed",
    suburbSlug: "kirrawee",
    categorySlug: "pub-food",
  },

  // ---------------- Kogarah ----------------
  {
    title: "$20 classic schnitzel lunch",
    description:
      "Classic crumbed schnitzel served on weekday lunchtimes at the Kogarah Hotel's INN Bistro.",
    venueName: "Kogarah Hotel",
    address: "70 Railway Parade, Kogarah NSW 2217",
    url: "https://www.kogarahhotel.com.au/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "kogarah",
    categorySlug: "pub-food",
  },
  {
    title: "$22 lunch + drink combo",
    description:
      "Rump, schnitzel, cheeseburger or fettuccine served with a beer, wine or soft drink, available for weekday-to-Saturday lunch at the Kogarah Hotel.",
    venueName: "Kogarah Hotel",
    address: "70 Railway Parade, Kogarah NSW 2217",
    url: "https://www.kogarahhotel.com.au/",
    specialPrice: 22,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    suburbSlug: "kogarah",
    categorySlug: "pub-food",
  },

  // ---------------- Menai ----------------
  {
    title: "$18 roast of the day",
    description:
      "Roast of the day with all the trimmings and Yorkshire pudding, a weekday lunch special at Club Central Menai's Terrace Bistro.",
    venueName: "Terrace Bistro, Club Central Menai",
    url: "https://clubcentralmenai.com.au/terrace-bistro/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "menai",
    categorySlug: "pub-food",
  },
  {
    title: "$24 Mongolian lamb stir-fry",
    description:
      "Mongolian lamb stir-fry with fried rice and Asian greens, part of the same seasonal weekday lunch specials menu at Club Central Menai's Terrace Bistro.",
    venueName: "Terrace Bistro, Club Central Menai",
    url: "https://clubcentralmenai.com.au/terrace-bistro/",
    specialPrice: 24,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "menai",
    categorySlug: "asian",
  },

  // ---------------- Miranda ----------------
  {
    title: "$15 lunch special",
    description:
      "A smaller-portion, budget-priced pub meal served Monday to Saturday at the Miranda Hotel.",
    venueName: "Miranda Hotel",
    address: "590 Kingsway, Miranda NSW 2228",
    url: "https://mirandahotel.com.au/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    suburbSlug: "miranda",
    categorySlug: "pub-food",
  },

  // ---------------- Mortdale ----------------
  {
    title: "$18 lunch special",
    description:
      "Everyday bistro lunch special at the Mortdale Hotel, part of its regular value meal lineup.",
    venueName: "Mortdale Hotel",
    address: "1 Pitt St, Mortdale NSW 2223",
    url: "https://mortdalehotel.com.au/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "mortdale",
    categorySlug: "pub-food",
  },

  // ---------------- Sutherland ----------------
  {
    title: "$10 schnitzel roll & chips",
    description:
      "A crumbed chicken schnitzel roll served with chips, a long-running budget lunch option at Boyles Hotel Sutherland.",
    venueName: "Boyles Hotel Sutherland",
    address: "806-810 Old Princes Hwy, Sutherland NSW 2232",
    url: "https://boyleshotel.com.au/menu/",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "sutherland",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Sylvania ----------------
  {
    title: "$15 weekday lunch special",
    description:
      "Discounted weekday lunch deal at the Crest Hotel Sylvania, part of its regular bistro specials.",
    venueName: "Crest Hotel Sylvania",
    address: "108/114 Princes Hwy, Sylvania NSW 2224",
    url: "https://cresthotelsylvania.com.au/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "sylvania",
    categorySlug: "pub-food",
  },
  {
    title: "$18 Sunday roast",
    description:
      "A rotating roast with all the trimmings, served Sundays for lunch and dinner at the Crest Hotel Sylvania (two meats available for $24).",
    venueName: "Crest Hotel Sylvania",
    address: "108/114 Princes Hwy, Sylvania NSW 2224",
    url: "https://cresthotelsylvania.com.au/",
    specialPrice: 18,
    availableDays: "Sun",
    suburbSlug: "sylvania",
    categorySlug: "pub-food",
  },
];

async function main() {
  const author = await prisma.user.findUniqueOrThrow({
    where: { email: "team@lunchspecial.com.au" },
  });

  // Cache suburb/category lookups since many rows repeat the same slug.
  const suburbCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();

  async function getSuburbId(slug: string) {
    if (!suburbCache.has(slug)) {
      const s = await prisma.suburb.findUniqueOrThrow({ where: { slug } });
      suburbCache.set(slug, s.id);
    }
    return suburbCache.get(slug)!;
  }

  async function getCategoryId(slug: string) {
    if (!categoryCache.has(slug)) {
      const c = await prisma.category.findUniqueOrThrow({ where: { slug } });
      categoryCache.set(slug, c.id);
    }
    return categoryCache.get(slug)!;
  }

  let created = 0;
  for (const s of SPECIALS) {
    const suburbId = await getSuburbId(s.suburbSlug);
    const categoryId = await getCategoryId(s.categorySlug);

    await prisma.special.create({
      data: {
        title: s.title,
        description: s.description,
        venueName: s.venueName,
        address: s.address,
        url: s.url,
        specialPrice: s.specialPrice,
        usualPrice: s.usualPrice,
        availableDays: s.availableDays ?? "Mon,Tue,Wed,Thu,Fri",
        startTime: s.startTime,
        endTime: s.endTime,
        authorId: author.id,
        suburbs: { create: [{ suburb: { connect: { id: suburbId } } }] },
        categories: { create: [{ category: { connect: { id: categoryId } } }] },
      },
    });
    created++;
  }

  console.log(
    `Seed complete. Created ${created} real South-region specials, authored by ${author.email}.`
  );
}

main().finally(() => prisma.$disconnect());
