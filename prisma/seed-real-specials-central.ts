import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real, currently (as of July 2026) advertised lunch specials researched via
// web search for LunchSpecial's Central-region Sydney suburb coverage:
// Alexandria, Annandale, Ashfield, Balmain, Burwood, Camperdown, Darlinghurst,
// Drummoyne, Dulwich Hill, Erskineville, Five Dock, Glebe, Haberfield,
// Homebush, Leichhardt, Paddington, Petersham, Pyrmont, Rozelle, St Peters,
// Stanmore, Strathfield, Summer Hill, Tempe, Ultimo, Waterloo.
//
// Each entry is backed by a real venue and a source URL found during
// research (mostly eatdrinkcheap.com.au listings cross-checked against the
// venue's own site/socials, or the venue's own site directly). Descriptions
// are written in our own words, not copied from source marketing copy.
//
// Coverage varies by suburb: some suburbs (Alexandria, Erskineville, Glebe,
// Paddington, Waterloo) turned up several confirmed specials; others
// (Ashfield, Haberfield, Petersham, Summer Hill) turned up no venue with a
// concretely-advertised lunch-special price after a thorough search, so no
// rows were fabricated for them.
//
// This script is additive: the author account is looked up by email (not
// created), and Special rows are created fresh each run with no upsert key,
// so re-running will duplicate rows -- run once.

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
  // ---------------- Alexandria ----------------
  {
    title: "$19 pizza or burger lunch special",
    description: "Any pizza or burger on the menu for one flat price, part of The MiTCH's weekday midday run.",
    venueName: "The MiTCH",
    address: "50-52 Mitchell Road, Alexandria",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-alexandria",
    specialPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "alexandria",
    categorySlug: "pub-food",
  },
  {
    title: "$15 weekday pub classics",
    description: "Pub classics served from just $15 on weekdays, the longest lunch window of the Botany Road pubs.",
    venueName: "Glenroy Hotel",
    address: "246 Botany Road, Alexandria",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-alexandria",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "16:00",
    suburbSlug: "alexandria",
    categorySlug: "pub-food",
  },
  {
    title: "$28 brewer's lunch: burger or wrap + schooner",
    description: "Any burger or wrap from the menu paired with a schooner from the core beer range, at the brewery's own taproom.",
    venueName: "Sydney Brewery Alexandria",
    address: "160 Bourke Road, Alexandria",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-alexandria",
    specialPrice: 28,
    availableDays: "Mon,Tue,Wed",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "alexandria",
    categorySlug: "pub-food",
  },
  {
    title: "$15 chicken or halloumi salad",
    description: "A lighter weekday lunch option alongside the pub's burgers and schnitzel, part of Iron Duke's midday specials board.",
    venueName: "Iron Duke Hotel",
    address: "220 Botany Rd, Alexandria",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-alexandria",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "alexandria",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Annandale ----------------
  {
    title: "$20 burger lunch special",
    description: "Choice of southern fried haloumi, southern fried chicken, or dry-aged beef burger, with the option to add a schooner for $5.",
    venueName: "The Annandale Hotel",
    address: "17 Parramatta Road, Annandale",
    url: "https://eatdrinkcheap.com.au/sydney/annandale-specials",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "14:30",
    suburbSlug: "annandale",
    categorySlug: "pub-food",
  },

  // ---------------- Balmain ----------------
  {
    title: "$25 steak & red wine Tuesday",
    description: "A 250g grass-fed steak served with a glass of red wine, available across the lunch and dinner sitting.",
    venueName: "East Village Hotel",
    address: "82 Darling St, Balmain East",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-balmain",
    specialPrice: 25,
    availableDays: "Tue",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "balmain",
    categorySlug: "pub-food",
  },

  // ---------------- Burwood ----------------
  {
    title: "$16 chicken schnitzel lunch",
    description: "Brasserie-style chicken schnitzel at the RSL club's everyday dining room, a longstanding cheap weekday lunch option.",
    venueName: "Club Burwood RSL",
    address: "96 Shaftesbury Rd, Burwood",
    url: "https://clubburwoodgroup.com.au/club-burwood-rsl/",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "burwood",
    categorySlug: "pub-food",
  },

  // ---------------- Camperdown ----------------
  {
    title: "$17 schnitzel, all day",
    description: "Crumbed chicken schnitzel available all day including lunch at this Missenden Road pub near RPA.",
    venueName: "Alfred Hotel",
    address: "51 Missenden Rd, Camperdown",
    url: "https://eatdrinkcheap.com.au/sydney/annandale-specials",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "camperdown",
    categorySlug: "pub-food",
  },

  // ---------------- Darlinghurst ----------------
  {
    title: "$16 pub classics, 7 days",
    description: "Fish and chips, schnitzel, beef burger, falafel burger, Caesar salad or steak, all at one price every day of the week.",
    venueName: "Courthouse Hotel",
    address: "189 Oxford Street, Darlinghurst",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-darlinghurst",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "darlinghurst",
    categorySlug: "pub-food",
  },
  {
    title: "$15 weekday lunch special",
    description: "Bangers & mash, fish & chips, chicken schnitzel & chips, Angus beef burger & chips, or loaded nachos, weekdays only.",
    venueName: "Oxford Hotel",
    address: "134 Oxford St, Darlinghurst",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-darlinghurst",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "darlinghurst",
    categorySlug: "pub-food",
  },

  // ---------------- Drummoyne ----------------
  {
    title: "$22 steak Monday",
    description: "A steak lunch (or dinner) special that runs the full afternoon and evening at this Victoria Road pub.",
    venueName: "The Oxford Hotel",
    address: "195 Victoria Rd, Drummoyne",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-drummoyne",
    specialPrice: 22,
    availableDays: "Mon",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "drummoyne",
    categorySlug: "pub-food",
  },

  // ---------------- Dulwich Hill ----------------
  {
    title: "$18 pub classics, lunch and dinner",
    description: "Schnitzel, cheeseburger, 250g rump steak, bangers & mash, or fish and chips, all one price, served across lunch and dinner.",
    venueName: "Gladstone Hotel",
    address: "572 Marrickville Road, Dulwich Hill",
    url: "https://eatdrinkcheap.com.au/sydney/ashfield-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "dulwich-hill",
    categorySlug: "pub-food",
  },
  {
    title: "$19.90 burger, yiros or chicken combo",
    description: "A choice of burger, yiros, or chicken plate, each served with chips, salad and a drink, on weekday lunch combos.",
    venueName: "The Eate",
    address: "555 New Canterbury Rd, Dulwich Hill",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-homebush",
    specialPrice: 19.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "16:00",
    suburbSlug: "dulwich-hill",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Erskineville ----------------
  {
    title: "$20 weekday lunch special (rotating dish)",
    description: "A different pub dish each day -- rump & fries on Monday, schnitzel Wednesday, fish and chips Thursday, veg lasagne Friday -- all at one price.",
    venueName: "Rose of Australia",
    address: "1 Swanson Street, Erskineville",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-erskineville",
    specialPrice: 20,
    availableDays: "Mon,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "erskineville",
    categorySlug: "pub-food",
  },
  {
    title: "$18 lunch",
    description: "An $18 pub lunch at this corner Erskineville local, known for long lunches and a laid-back beer garden.",
    venueName: "The Erko (Erskineville Hotel)",
    address: "102 Erskineville Rd, Erskineville",
    url: "https://theerko.com.au/food-menu",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "erskineville",
    categorySlug: "pub-food",
  },

  // ---------------- Five Dock ----------------
  {
    title: "$16 petite roast of the day",
    description: "A smaller weekday roast plate at the RSL's members bistro, alongside $15-18 bangers & mash and penne napoli options.",
    venueName: "Club Five Dock RSL (Dock & Co)",
    address: "66 Great North Road, Five Dock",
    url: "https://www.clubfivedock.com.au/dock-co",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:30",
    suburbSlug: "five-dock",
    categorySlug: "pub-food",
  },

  // ---------------- Glebe ----------------
  {
    title: "Weekday lunch special from $18",
    description: "A long-running weekday lunch deal at this Glebe institution, with mains starting from $18.",
    venueName: "Nag's Head Hotel",
    address: "162 St Johns Road, Glebe",
    url: "https://thehappiesthour.com/venues/sydney/nags-head-hotel/specials/lunch-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "glebe",
    categorySlug: "pub-food",
  },
  {
    title: "$15 salads with any drink purchase",
    description: "Bar-side weekday salads at $15, part of the Glebe Hotel's midday food specials alongside $18 burgers and sandwiches.",
    venueName: "Glebe Hotel",
    url: "https://www.theglebehotel.com.au/food-beverage",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "glebe",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Homebush ----------------
  {
    title: "$20 daily steak meal with salad",
    description: "A straightforward steak-and-salad plate served daily at this Parramatta Road local pub near Homebush.",
    venueName: "Homebush Hotel",
    address: "136 Parramatta Road, Homebush West NSW 2140",
    url: "https://homebushhotel.com.au/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "homebush",
    categorySlug: "pub-food",
  },

  // ---------------- Leichhardt ----------------
  {
    title: "$20 burger, fries & schooner Friday lunch",
    description: "A burger and fries paired with a schooner of Crowbar's own beer, running through the Friday lunch window.",
    venueName: "Crowbar Sydney",
    address: "345 Parramatta Rd, Leichhardt",
    url: "https://eatdrinkcheap.com.au/sydney/annandale-specials",
    specialPrice: 20,
    availableDays: "Fri",
    startTime: "11:00",
    endTime: "16:00",
    suburbSlug: "leichhardt",
    categorySlug: "pub-food",
  },

  // ---------------- Paddington ----------------
  {
    title: "$18 weekday lunch special",
    description: "Cheeseburger, chicken schnitzel, or Caesar salad, each $18, weekday lunch at this Glenmore Road corner pub.",
    venueName: "The Village Inn",
    address: "9-11 Glenmore Rd, Paddington",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-paddington",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "paddington",
    categorySlug: "pub-food",
  },
  {
    title: "$15 weekday lunch specials",
    description: "Burger, pasta, fish & chips, or chicken schnitzel for $15, with a 300g rump steak upgrade for $20.",
    venueName: "Imperial Hotel",
    address: "252 Oxford St, Paddington",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-paddington",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "paddington",
    categorySlug: "pub-food",
  },

  // ---------------- Pyrmont ----------------
  {
    title: "$18 weekday lunch",
    description: "Cheeseburger, chicken skewers, Greek salad with chicken, house-crumbed schnitzel, or grain-fed rump steak, weekday lunch only.",
    venueName: "Dunkirk Hotel",
    address: "205 Harris Street, Pyrmont",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-pyrmont",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "pyrmont",
    categorySlug: "pub-food",
  },
  {
    title: "$25 traditional Sunday roast",
    description: "A full traditional roast with all the trimmings, served with the purchase of any drink, running through the Sunday lunch sitting.",
    venueName: "Pyrmont Bridge Hotel",
    address: "96 Union St, Pyrmont",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-pyrmont",
    specialPrice: 25,
    availableDays: "Sun",
    startTime: "11:00",
    endTime: "21:00",
    suburbSlug: "pyrmont",
    categorySlug: "pub-food",
  },

  // ---------------- Rozelle ----------------
  {
    title: "$20 Irish spice bag Friday",
    description: "The Irish-Chinese takeaway classic (spiced chips, fried chicken, chilli and onion) done as a Friday lunch-into-afternoon special.",
    venueName: "Bald Rock Hotel",
    address: "15 Mansfield St, Rozelle",
    url: "https://www.baldrockhotel.com.au/new-page",
    specialPrice: 20,
    availableDays: "Fri",
    startTime: "12:00",
    endTime: "18:00",
    suburbSlug: "rozelle",
    categorySlug: "pub-food",
  },

  // ---------------- St Peters ----------------
  {
    title: "$18 lunch special",
    description: "A straightforward $18 pub lunch served over the early-afternoon window, Monday through Thursday.",
    venueName: "Southern Cross Hotel",
    address: "340 Princes Hwy, St Peters",
    url: "https://eatdrinkcheap.com.au/sydney/st+peters-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "11:00",
    endTime: "14:00",
    suburbSlug: "st-peters",
    categorySlug: "pub-food",
  },

  // ---------------- Stanmore ----------------
  {
    title: "$25 steak & drink Wednesday",
    description: "A 220g rump steak with chips, salad and gravy, plus a choice of house schooner, wine or spirit, running lunch through dinner.",
    venueName: "The Salisbury Hotel",
    address: "118 Percival Rd, Stanmore",
    url: "https://eatdrinkcheap.com.au/sydney/annandale-specials",
    specialPrice: 25,
    availableDays: "Wed",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "stanmore",
    categorySlug: "pub-food",
  },

  // ---------------- Strathfield ----------------
  {
    title: "$15 vegetable bibimbap",
    description: "Rice topped with assorted vegetables and a fried egg, served with chilli paste sauce, from the club's dedicated Korean lunch-special menu.",
    venueName: "Strathfield Sports Club",
    address: "4a Lyons Street, Strathfield",
    url: "https://strathfieldsportsclub.com.au/lunch-special/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "strathfield",
    categorySlug: "asian",
  },
  {
    title: "$16 earthen bowl spicy pork spare rib",
    description: "Braised pork spare ribs in a red chilli-based sauce, served in a sizzling earthen bowl, from the same weekday Korean lunch-special menu.",
    venueName: "Strathfield Sports Club",
    address: "4a Lyons Street, Strathfield",
    url: "https://strathfieldsportsclub.com.au/lunch-special/",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "strathfield",
    categorySlug: "asian",
  },

  // ---------------- Tempe ----------------
  {
    title: "$18 chicken schnitzel Tuesday",
    description: "A classic crumbed chicken schnitzel at one price, running all day Tuesday at this Princes Highway local.",
    venueName: "Tempe Hotel",
    address: "735 Princes Hwy, Tempe",
    url: "https://tempehotel.com.au/eat-drink-at-tempe-hotel/",
    specialPrice: 18,
    availableDays: "Tue",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "tempe",
    categorySlug: "pub-food",
  },
  {
    title: "$18 loaded burger Thursday",
    description: "A loaded burger special running through the Thursday bistro lunch sitting at Tempe Hotel.",
    venueName: "Tempe Hotel",
    address: "735 Princes Hwy, Tempe",
    url: "https://tempehotel.com.au/eat-drink-at-tempe-hotel/",
    specialPrice: 18,
    availableDays: "Thu",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "tempe",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Ultimo ----------------
  {
    title: "$24 chicken schnitzel weekday lunch",
    description: "A 300g chicken breast schnitzel with fries, salad and a choice of sauce, with a $4 upgrade to a parmi, on the pub's weekday lunch specials board.",
    venueName: "Glasgow Arms Hotel",
    address: "527 Harris Street, Ultimo",
    url: "https://glasgowarmsultimo.com.au/dine",
    specialPrice: 24,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "ultimo",
    categorySlug: "pub-food",
  },

  // ---------------- Waterloo ----------------
  {
    title: "$12 weekday lunch special",
    description: "Sweet & sour pork, pulled jackfruit tacos, a classic cheeseburger, or a chicken schnitzel burger, all $12 across a wide weekday lunch window.",
    venueName: "The Cauliflower Hotel",
    address: "123 Botany Road, Waterloo",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-waterloo",
    specialPrice: 12,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "17:00",
    suburbSlug: "waterloo",
    categorySlug: "sandwiches-rolls",
  },
  {
    title: "$16 weekday lunch special",
    description: "One of six rotating weekday lunch specials in the bistro, priced at $16 for a hearty pub meal.",
    venueName: "Moore Park View Hotel",
    address: "853 South Dowling St, Waterloo",
    url: "https://eatdrinkcheap.com.au/sydney/lunch-specials-waterloo",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "waterloo",
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

  console.log(`Seed complete. Created ${created} real Central-region specials, authored by ${author.email}.`);
}

main().finally(() => prisma.$disconnect());
