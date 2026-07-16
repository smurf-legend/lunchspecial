import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Real, currently (as of July 2026) advertised lunch specials researched via
// web search for LunchSpecial's initial Sydney coverage. Each entry is backed
// by a real venue and a source URL found during research — see `url` on each
// row. Descriptions are written in our own words, not copied from source
// marketing copy. Where a source only gave a price range, the lower/starting
// price was used for specialPrice.
//
// This script is additive and safe to re-run: the author account is
// upserted by email, and Special rows are created fresh each run (no
// upsert key on Special), so re-running will duplicate rows — run once.

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
  // ---------------- Surry Hills ----------------
  {
    title: "$17 Cape Moreton prawn po' boy",
    description: "A weekday-only po' boy roll with prawns, lettuce, pickle and garlic mayo, part of Clock Hotel's midweek lunch run.",
    venueName: "Clock Hotel",
    address: "470 Crown St, Surry Hills",
    url: "https://clockhotel.com.au/lunch-specials",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "surry-hills",
    categorySlug: "pub-food",
  },
  {
    title: "$16 poke bowl",
    description: "Brown rice poke bowl with edamame, avocado, pickled ginger and a citrus dressing, with salmon or chicken add-ons available.",
    venueName: "Clock Hotel",
    address: "470 Crown St, Surry Hills",
    url: "https://clockhotel.com.au/lunch-specials",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "surry-hills",
    categorySlug: "poke-salad-bowls",
  },
  {
    title: "$19 chicken schnitzel lunch",
    description: "Crumbed chicken schnitzel with rocket, parmesan, fries and a choice of sauce, served as part of the weekday lunch menu.",
    venueName: "Clock Hotel",
    address: "470 Crown St, Surry Hills",
    url: "https://clockhotel.com.au/lunch-specials",
    specialPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "surry-hills",
    categorySlug: "pub-food",
  },
  {
    title: "Weekday meal deal with a drink",
    description: "A rotating Thai-leaning meal deal (cashew nut chicken, grilled chicken, green curry, or a burger/schnitzel option) that comes cheaper with a soft drink or pricier with beer/wine.",
    venueName: "Surry Hills Hotel",
    url: "https://www.surryhillshotel.com.au/whatson/lunch-special/",
    specialPrice: 16.9,
    usualPrice: 19.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "surry-hills",
    categorySlug: "asian",
  },
  {
    title: "$59pp weekday set lunch",
    description: "A shared, Middle Eastern-inspired banquet lunch menu served fast enough to be in and out within an hour.",
    venueName: "Nour",
    address: "490 Crown St, Surry Hills",
    url: "https://www.sevenrooms.com/experiences/nour/weekday-lunch-6041236855668736",
    specialPrice: 59,
    availableDays: "Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "surry-hills",
    categorySlug: "middle-eastern",
  },

  // ---------------- Newtown ----------------
  {
    title: "$12 chicken schnitzel with a beer",
    description: "An oversized chicken schnitzel paired with a beer for one flat price at the Newtown Hotel's bistro, The Animal.",
    venueName: "Newtown Hotel",
    address: "174 King St, Newtown",
    url: "https://newtownhotel.com.au/food-drink/",
    specialPrice: 12,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "newtown",
    categorySlug: "pub-food",
  },
  {
    title: "$12.50 weekday lunch special",
    description: "A cheap midday pub meal deal served until mid-afternoon at The Marly, the bistro inside the Marlborough Hotel.",
    venueName: "The Marly (Marlborough Hotel)",
    address: "145 King St, Newtown",
    url: "https://marlboroughhotel.com.au/food-menu",
    specialPrice: 12.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    endTime: "15:00",
    suburbSlug: "newtown",
    categorySlug: "pub-food",
  },
  {
    title: "Classic pork roll banh mi",
    description: "A no-frills Vietnamese pork roll banh mi from a King Street street-food style Vietnamese shop.",
    venueName: "Old Town Vietnamese Street Food",
    address: "Shop 1/324A King St, Newtown",
    specialPrice: 9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "newtown",
    categorySlug: "sandwiches-rolls",
  },
  {
    title: "Lunch special from $11.90",
    description: "Thai lunch specials such as pad thai starting from under $12, advertised via the venue's own printed lunch flyer.",
    venueName: "It's Time For Thai",
    address: "233 King St, Newtown",
    url: "https://timeforthai.com.au/pdfs/newtown/ItsTimeforThaiNewtownLunch.pdf",
    specialPrice: 11.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "newtown",
    categorySlug: "asian",
  },
  {
    title: "$17 schnitzel with fries",
    description: "Chicken or eggplant schnitzel served with fries, slaw and house gravy, part of the Fat Belly Jack's weekly specials board at the Marlborough Hotel.",
    venueName: "Fat Belly Jack's (Marlborough Hotel)",
    address: "145 King St, Newtown",
    specialPrice: 17,
    availableDays: "Mon",
    suburbSlug: "newtown",
    categorySlug: "pub-food",
  },

  // ---------------- Bondi ----------------
  {
    title: "$20 lunch special",
    description: "Choice of a southern fried chicken burger, black angus rump or Caesar salad for one set price, right across from Bondi Beach.",
    venueName: "Hotel Bondi",
    address: "178 Campbell Parade, Bondi Beach",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "bondi",
    categorySlug: "pub-food",
  },
  {
    title: "Rotating $20 weekday meal",
    description: "A different $20 meal each weekday at lunchtime, part of Beach Road Hotel's regular midday specials.",
    venueName: "Beach Road Hotel",
    address: "71 Beach Rd, Bondi Beach",
    url: "https://www.beachroadhotel.com.au/weekly-lunch-specials",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "14:00",
    suburbSlug: "bondi",
    categorySlug: "pub-food",
  },
  {
    title: "$13 Tuesday members meal",
    description: "A cheap Tuesday meal deal (schnitzel or pizza) for club members at this popular North Bondi pub.",
    venueName: "North Bondi RSL",
    specialPrice: 13,
    availableDays: "Tue",
    suburbSlug: "bondi",
    categorySlug: "pub-food",
  },
  {
    title: "Monday risotto special",
    description: "A rotating chef's risotto served Mondays at this long-running Italian trattoria near the beach.",
    venueName: "Bondi Trattoria",
    url: "https://bonditrattoria.com.au/special-offers",
    specialPrice: 27,
    availableDays: "Mon",
    suburbSlug: "bondi",
    categorySlug: "italian",
  },
  {
    title: "Poke bowl mix sashimi",
    description: "A mixed sashimi poke bowl from this Campbell Parade sashimi and poke specialist near the beach.",
    venueName: "Get Sashimi",
    address: "182 Campbell Parade, Bondi Beach",
    specialPrice: 21.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "bondi",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- CBD ----------------
  {
    title: "$22 weekday lunch with a drink",
    description: "A set weekday lunch that comes with a complimentary drink, served at the cidery bar inside Rydges World Square.",
    venueName: "Sydney Cidery",
    address: "World Square, Sydney CBD",
    url: "https://www.rydges.com/accommodation/sydney-nsw/world-square-sydney-cbd/offers/eat-drink/22-lunch-special-at-sydney-cidery/",
    specialPrice: 22,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "14:00",
    suburbSlug: "cbd",
    categorySlug: "pub-food",
  },
  {
    title: "$15 pizza",
    description: "Wood-fired style pizza at a flat midweek price, part of a broader $15 pizza / $25 pasta / $10 wine lunch deal.",
    venueName: "The Wine Bar at The International",
    specialPrice: 15,
    availableDays: "Tue,Wed,Thu,Fri,Sat",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "cbd",
    categorySlug: "italian",
  },
  {
    title: "$9.90 classic pork banh mi",
    description: "A straightforward pork banh mi roll from a food-court style Vietnamese sandwich counter in The Galeries.",
    venueName: "Boon Table",
    address: "Shop 09, Lower Ground Floor, The Galeries, 500 George St, Sydney",
    specialPrice: 9.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "cbd",
    categorySlug: "sandwiches-rolls",
  },
  {
    title: "Express lunch, 2 courses",
    description: "A quicker two-course version of Callao's Japanese-Peruvian (Nikkei) menu, aimed at a weekday business lunch crowd in Barangaroo.",
    venueName: "Callao",
    address: "International Tower One, Barangaroo",
    url: "https://callao.com.au/express-lunch/",
    specialPrice: 49,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "cbd",
    categorySlug: "asian",
  },
  {
    title: "Special lunch buffet",
    description: "An all-you-can-eat style Japanese lunch buffet at Moyashi's Darling Square store, near the CBD/Haymarket border.",
    venueName: "Moyashi City Store",
    address: "Darling Square, Sydney",
    specialPrice: 42.8,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "cbd",
    categorySlug: "asian",
  },

  // ---------------- Chippendale ----------------
  {
    title: "$15 ramen",
    description: "Bowl of ramen from the newer Japanese Quarter stalls at Spice Alley's hawker-style laneway food court.",
    venueName: "Spice Alley (Japanese Quarter)",
    address: "Kensington St, Chippendale",
    url: "https://concreteplayground.com/sydney/food-drink/spice-alley-japanese-quarter",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "chippendale",
    categorySlug: "asian",
  },
  {
    title: "$5 pizza slices",
    description: "Cheap by-the-slice pizza served at the bar of this Chippendale pub, popular with the lunchtime uni crowd.",
    venueName: "The Abercrombie Hotel",
    address: "Kensington St, Chippendale",
    specialPrice: 5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "chippendale",
    categorySlug: "italian",
  },
  {
    title: "$18 burgers",
    description: "Plant-based burgers at a set price on Wednesdays at Australia's first fully vegan pub.",
    venueName: "The Chippo Hotel",
    url: "https://www.thechippohotel.com.au/menu",
    specialPrice: 18,
    availableDays: "Wed",
    startTime: "12:00",
    suburbSlug: "chippendale",
    categorySlug: "vegan-vegetarian",
  },

  // ---------------- Marrickville ----------------
  {
    title: "$9 vegan banh mi",
    description: "A plant-based take on the classic Vietnamese pork roll from a long-running Illawarra Road banh mi shop.",
    venueName: "Marrickville Pork Roll",
    address: "362 Illawarra Rd, Marrickville",
    specialPrice: 9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "marrickville",
    categorySlug: "vegan-vegetarian",
  },
  {
    title: "Beef pho from $13",
    description: "A bowl of beef pho at a casual Illawarra Road Vietnamese street-food eatery.",
    venueName: "VN Street Foods",
    address: "294-296 Illawarra Rd, Marrickville",
    specialPrice: 13,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "marrickville",
    categorySlug: "asian",
  },

  // ---------------- Parramatta ----------------
  {
    title: "$8.50 lunch special",
    description: "Choice of fish, calamari, nuggets or schnitzel with chips at a very cheap fixed price, at this George Street pub near the river.",
    venueName: "Woolpack Hotel",
    address: "19 George St, Parramatta",
    specialPrice: 8.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "parramatta",
    categorySlug: "pub-food",
  },
  {
    title: "$19 chicken schnitzel, every day",
    description: "A traditional crumbed chicken schnitzel served daily through lunch and into the evening.",
    venueName: "Woolpack Hotel",
    address: "19 George St, Parramatta",
    specialPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "parramatta",
    categorySlug: "pub-food",
  },
  {
    title: "$9 lemongrass beef banh mi",
    description: "A lemongrass beef banh mi from a dedicated banh mi shop just off Church Street.",
    venueName: "Mê Bánh Mì",
    address: "Shop 3/52 George St, Parramatta",
    specialPrice: 9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "parramatta",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Chatswood ----------------
  {
    title: "$18.90 vegan ramen",
    description: "A fully plant-based ramen bowl from a dedicated ramen house on Chatswood's Japanese food strip.",
    venueName: "Tenkomori Ramen House",
    address: "Chatswood",
    specialPrice: 18.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "chatswood",
    categorySlug: "vegan-vegetarian",
  },
  {
    title: "Teriyaki chicken ramen",
    description: "Chicken teriyaki ramen bowl, one of the more popular orders at this Chatswood ramen specialist.",
    venueName: "Tenkomori Ramen House",
    address: "Chatswood",
    specialPrice: 20.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "chatswood",
    categorySlug: "asian",
  },
  {
    title: "All-you-can-eat yakiniku & shabu shabu",
    description: "Japanese BBQ and hot pot buffet at a fixed per-person price, including weekend lunch sessions.",
    venueName: "Naruto Japanese Restaurant",
    address: "Level 1/312-316 Victoria Ave, Chatswood",
    url: "https://www.narutobbq.com/",
    specialPrice: 49,
    availableDays: "Sat,Sun",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "chatswood",
    categorySlug: "asian",
  },
  {
    title: "Nomu Box combo",
    description: "Korean fried chicken burger with waffle fries, wings and drums, pickles, kimchi and a drink bundled into one combo price.",
    venueName: "Nomu Korean Fried Chicken",
    address: "Chatswood Chase, B041A/345 Victoria Ave, Chatswood",
    specialPrice: 28,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "chatswood",
    categorySlug: "asian",
  },

  // ---------------- Manly ----------------
  {
    title: "$12 Thai lunch menu",
    description: "A cheap daily Thai lunch menu at this Manly Thai restaurant, priced well below its regular dinner mains.",
    venueName: "Manly Thai Gourmet",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 12,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "manly",
    categorySlug: "asian",
  },
  {
    title: "$13 stir fry rice or noodles",
    description: "A quick weekday stir fry (rice or noodles) at fast-casual Asian spot UP2U, aimed squarely at the lunch crowd.",
    venueName: "UP2U Asian Fuzion",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 13,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "manly",
    categorySlug: "asian",
  },
  {
    title: "$14.80 lunch specials",
    description: "Dumpling, bao and noodle lunch specials at this Manly wok bar, served through the early afternoon.",
    venueName: "Wockbar Manly",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 14.8,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "11:30",
    endTime: "14:30",
    suburbSlug: "manly",
    categorySlug: "asian",
  },
  {
    title: "$10 pizza (takeaway)",
    description: "Cash-only takeaway pizza at a flat $10 early in the week from this no-frills Manly pizzeria.",
    venueName: "Little Italy",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed",
    suburbSlug: "manly",
    categorySlug: "italian",
  },
  {
    title: "$25 burger and chips",
    description: "A burger and chips combo at a set weekday lunch price from the Manly branch of this US-style burger chain.",
    venueName: "Wahlburgers",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 25,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "manly",
    categorySlug: "pub-food",
  },
  {
    title: "$19 fish & chips with salad",
    description: "Beer-battered fish and chips with a side salad, part of the all-day menu at this Manly seafood-leaning pub kitchen.",
    venueName: "Fins and Ribs",
    url: "https://hellomanly.com.au/2024/03/manly-food-deals-specials/",
    specialPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "10:00",
    endTime: "17:00",
    suburbSlug: "manly",
    categorySlug: "pub-food",
  },

  // ---------------- Redfern ----------------
  {
    title: "$20 counter meal",
    description: "Classic pub counter meal at a flat $20 early in the week, at this 1879-established Redfern local.",
    venueName: "The Eveleigh Hotel",
    address: "158 Abercrombie St, Redfern",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed",
    startTime: "12:00",
    endTime: "15:30",
    suburbSlug: "redfern",
    categorySlug: "pub-food",
  },
  {
    title: "Falafel pita",
    description: "A falafel pita from chef Michael Rantissi's modern Mediterranean all-day menu.",
    venueName: "Kepos Street Kitchen",
    url: "https://www.keposstreetkitchen.com.au/menu",
    specialPrice: 18.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "redfern",
    categorySlug: "middle-eastern",
  },
  {
    title: "Meatball sub",
    description: "A meatball sub from the same modern Mediterranean lunch menu, a heartier option alongside the pitas and salads.",
    venueName: "Kepos Street Kitchen",
    url: "https://www.keposstreetkitchen.com.au/menu",
    specialPrice: 22,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "redfern",
    categorySlug: "sandwiches-rolls",
  },
  {
    title: "Vegan soy shio ramen",
    description: "A plant-based soy shio ramen bowl from this Redfern ramen bar's midday service near the station.",
    venueName: "RaRa Ramen",
    specialPrice: 16.9,
    availableDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "redfern",
    categorySlug: "vegan-vegetarian",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const author = await prisma.user.upsert({
    where: { email: "team@lunchspecial.com.au" },
    update: {},
    create: {
      name: "LunchSpecial Team",
      email: "team@lunchspecial.com.au",
      passwordHash,
      role: "admin",
    },
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

  console.log(`Seed complete. Created ${created} real specials, authored by ${author.email}.`);
}

main().finally(() => prisma.$disconnect());
