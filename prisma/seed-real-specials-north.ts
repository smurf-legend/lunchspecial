import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real, currently (as of July 2026) advertised lunch specials researched via
// web search for LunchSpecial's North-region Sydney coverage (Northern
// Beaches, Lower North Shore, Upper North Shore, North West). Each entry is
// backed by a real venue and a source URL found during research — see `url`
// on each row. Descriptions are written in our own words, not copied from
// source marketing copy. Where research turned up a venue but no verifiable
// current price, or the venue's real address fell outside the target
// suburb (e.g. Balgowlah RSL is actually in Seaforth), the entry was
// dropped rather than guessed.
//
// This script is additive: it looks up the existing editorial author account
// by email and existing Suburb/Category rows by slug, and only creates new
// Special rows — it does not touch existing data. Special rows have no
// upsert key, so re-running this script will duplicate rows — run once.

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
  // ---------------- Avalon Beach ----------------
  {
    title: "$15 Angus rump steak (Monday)",
    description: "Weekly Monday bistro special at the RSL: a 250g Angus rump steak with salad, fries and a choice of sauce.",
    venueName: "Avalon Beach RSL (Bistro 61)",
    address: "1 Bowling Green Lane, Avalon Beach NSW",
    url: "https://www.avalonrsl.com.au/weeklyspecials.html",
    specialPrice: 15,
    availableDays: "Mon",
    suburbSlug: "avalon-beach",
    categorySlug: "pub-food",
  },
  {
    title: "$15 chicken schnitzel (Wednesday)",
    description: "Wednesday bistro special: a crumbed chicken breast schnitzel with salad, fries, lemon and a choice of sauce.",
    venueName: "Avalon Beach RSL (Bistro 61)",
    address: "1 Bowling Green Lane, Avalon Beach NSW",
    url: "https://www.avalonrsl.com.au/weeklyspecials.html",
    specialPrice: 15,
    availableDays: "Wed",
    suburbSlug: "avalon-beach",
    categorySlug: "pub-food",
  },
  {
    title: "$20 burger and a drink (Friday)",
    description: "Friday special at the RSL bistro: any burger from the menu (excluding the double bacon burger) plus a beverage.",
    venueName: "Avalon Beach RSL (Bistro 61)",
    address: "1 Bowling Green Lane, Avalon Beach NSW",
    url: "https://www.avalonrsl.com.au/weeklyspecials.html",
    specialPrice: 20,
    availableDays: "Fri",
    suburbSlug: "avalon-beach",
    categorySlug: "pub-food",
  },

  // ---------------- Belrose ----------------
  {
    title: "$16 Tuesday meal special",
    description: "A weekly Tuesday meal deal running all day at the local pub, offering a discounted bistro main.",
    venueName: "Belrose Hotel",
    address: "5 Hews Pde, Belrose NSW 2085",
    url: "https://eatdrinkcheap.com.au/sydney/belrose-specials",
    specialPrice: 16,
    availableDays: "Tue",
    startTime: "12:00",
    endTime: "21:00",
    suburbSlug: "belrose",
    categorySlug: "pub-food",
  },

  // ---------------- Brookvale ----------------
  {
    title: "$18 pub classics lunch (schnitzel)",
    description: "Midweek pub classics deal covering chicken schnitzel, 250g rump steak, cheeseburger or a chef's pasta special, served lunch and dinner.",
    venueName: "Brookvale Hotel",
    address: "511 Pittwater Rd, Brookvale NSW 2100",
    url: "https://eatdrinkcheap.com.au/sydney/brookvale-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu",
    suburbSlug: "brookvale",
    categorySlug: "pub-food",
  },
  {
    title: "$18 pub classics lunch (Caesar salad)",
    description: "Same midweek pub classics deal at the Brookvale Hotel, with a Caesar salad as one of the set options.",
    venueName: "Brookvale Hotel",
    address: "511 Pittwater Rd, Brookvale NSW 2100",
    url: "https://eatdrinkcheap.com.au/sydney/brookvale-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu",
    suburbSlug: "brookvale",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Cherrybrook ----------------
  {
    title: "$16.50 bistro lunch special",
    description: "Discounted bistro main at the sports club, running for lunch and dinner midweek and lunch on Friday and Saturday.",
    venueName: "West Pennant Hills Sports Club",
    address: "103 New Line Rd, Cherrybrook NSW 2126",
    url: "https://wphsportsclub.com.au/dining/",
    specialPrice: 16.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    suburbSlug: "cherrybrook",
    categorySlug: "pub-food",
  },

  // ---------------- Crows Nest ----------------
  {
    title: "$40 vegetarian Indian lunch special",
    description: "A set eat-in vegetarian lunch of a mini masala dosai starter, a choice of curry, basmati rice and naan.",
    venueName: "Malabar Cuisine",
    address: "334 Pacific Highway, Crows Nest NSW 2065",
    url: "https://malabarcuisine.com.au/crowsnest/lunch-special/",
    specialPrice: 40,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "crows-nest",
    categorySlug: "asian",
  },
  {
    title: "$42 non-vegetarian Indian lunch special",
    description: "The non-vegetarian version of the eat-in set lunch: a dosai starter, choice of curry, basmati rice and naan.",
    venueName: "Malabar Cuisine",
    address: "334 Pacific Highway, Crows Nest NSW 2065",
    url: "https://malabarcuisine.com.au/crowsnest/lunch-special/",
    specialPrice: 42,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "crows-nest",
    categorySlug: "asian",
  },

  // ---------------- Dee Why ----------------
  {
    title: "$25 market fish lunch",
    description: "Midweek lunch special: the day's market fish, served as a main course.",
    venueName: "Corretto Dee Why",
    address: "1/24 The Strand, Dee Why NSW 2099",
    url: "https://correttodeewhy.com/",
    specialPrice: 25,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "dee-why",
    categorySlug: "cafe",
  },
  {
    title: "$28 rump steak lunch",
    description: "Midweek lunch special: rump steak with salad and fries.",
    venueName: "Corretto Dee Why",
    address: "1/24 The Strand, Dee Why NSW 2099",
    url: "https://correttodeewhy.com/",
    specialPrice: 28,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "dee-why",
    categorySlug: "pub-food",
  },

  // ---------------- Forestville ----------------
  {
    title: "$12.50 bistro lunch (Mon & Thu)",
    description: "A cut-price bistro lunch offer at the RSL club, running on Mondays and Thursdays.",
    venueName: "Forestville RSL Club",
    address: "22 Melwood Ave, Forestville NSW 2087",
    url: "https://www.forestvillersl.com.au/whatson/weekly-food-specials",
    specialPrice: 12.5,
    availableDays: "Mon,Thu",
    startTime: "11:30",
    endTime: "14:30",
    suburbSlug: "forestville",
    categorySlug: "pub-food",
  },

  // ---------------- Gordon ----------------
  {
    title: "$45pp three-course pasta lunch",
    description: "A weekend three-course set lunch built around a pasta main, at the Italian bar and restaurant on the Pacific Highway.",
    venueName: "Bar Infinita",
    address: "10 St Johns Ave, Gordon NSW 2072",
    url: "https://www.barinfinita.com.au/",
    specialPrice: 45,
    availableDays: "Sat,Sun",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "gordon",
    categorySlug: "italian",
  },
  {
    title: "$49pp three-course Wagyu steak lunch",
    description: "The steak version of Bar Infinita's weekend three-course set lunch, built around a Wagyu steak main.",
    venueName: "Bar Infinita",
    address: "10 St Johns Ave, Gordon NSW 2072",
    url: "https://www.barinfinita.com.au/",
    specialPrice: 49,
    availableDays: "Sat,Sun",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "gordon",
    categorySlug: "italian",
  },

  // ---------------- Hornsby ----------------
  {
    title: "$20 schnitzel lunch",
    description: "Weekday lunch deal at the pub: a schnitzel served with fries, slaw and a choice of sauce.",
    venueName: "Hornsby Inn",
    address: "Cnr Hunter & Burdett St, Hornsby NSW 2077",
    url: "https://hornsbyinn.com.au/whats-on/mid-week-lunch-specials",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "hornsby",
    categorySlug: "pub-food",
  },
  {
    title: "$20 Chicken Caesar salad lunch",
    description: "Same weekday pub lunch deal, with a Chicken Caesar salad option featuring cos lettuce, bacon and parmesan.",
    venueName: "Hornsby Inn",
    address: "Cnr Hunter & Burdett St, Hornsby NSW 2077",
    url: "https://hornsbyinn.com.au/whats-on/mid-week-lunch-specials",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "hornsby",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Lane Cove ----------------
  {
    title: "$12 Thai lunch deal",
    description: "A value lunch set of spring rolls, a soft drink and a main dish at this Longueville Road Thai restaurant.",
    venueName: "Patchai Thai Restaurant",
    address: "92B Longueville Rd, Lane Cove NSW 2066",
    url: "https://patchai-thai.com.au/",
    specialPrice: 12,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "lane-cove",
    categorySlug: "asian",
  },

  // ---------------- Mona Vale ----------------
  {
    title: "$95pp bottomless two-course lunch",
    description: "A two-hour, two-course bottomless drinks lunch in the bar at this bistro overlooking Mona Vale Golf Course, weekends only.",
    venueName: "The Mona Social",
    address: "3 Golf Ave, Mona Vale NSW 2103",
    url: "https://www.themonasocial.com.au/",
    specialPrice: 95,
    availableDays: "Sat,Sun",
    suburbSlug: "mona-vale",
    categorySlug: "pub-food",
  },

  // ---------------- Mosman ----------------
  {
    title: "$39 lunch special with a glass of wine",
    description: "A weekday-only fixed-price lunch main with a complimentary glass of wine, at this Balmoral Beach fine-diner.",
    venueName: "Public Dining Room",
    address: "2A The Esplanade, Mosman NSW 2088",
    url: "https://www.publicdiningroom.com.au/",
    specialPrice: 39,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "mosman",
    categorySlug: "pub-food",
  },
  {
    title: "$20 locals lunch",
    description: "A midweek locals lunch deal with a choice of a classic cheeseburger, house-made chicken schnitzel or beer-battered barramundi, all served with fries.",
    venueName: "The Buena",
    address: "76 Middle Head Rd, Mosman NSW 2088",
    url: "https://www.thebuena.com.au/menu-item/special-lunch-deals/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "mosman",
    categorySlug: "pub-food",
  },

  // ---------------- Narrabeen ----------------
  {
    title: "$14.90 Thai lunch special",
    description: "A fixed-price lunch special at this Pittwater Road Thai restaurant.",
    venueName: "Chilli Club Narrabeen",
    address: "1354 Pittwater Rd, Narrabeen NSW 2101",
    url: "https://www.chilliclubnarrabeen.com/",
    specialPrice: 14.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "narrabeen",
    categorySlug: "asian",
  },

  // ---------------- North Sydney ----------------
  {
    title: "$18 three tacos (Taco Tuesday)",
    description: "Three tacos of your choice (from options including asada beef, pork el pastor, fish, chicken, prawn or eggplant) every Tuesday, all day, at this rooftop bar.",
    venueName: "Four Hundred Bar & Kitchen",
    address: "Greenwood Plaza Rooftop, 36 Blue St, North Sydney NSW 2060",
    url: "https://northsydneyliving.com.au/north-sydney-lunch-specials/",
    specialPrice: 18,
    availableDays: "Tue",
    suburbSlug: "north-sydney",
    categorySlug: "pub-food",
  },
  {
    title: "$59pp Pranzo Espresso two-course lunch",
    description: "A weekday two-course Italian set lunch menu at this Miller Street restaurant.",
    venueName: "Antica Dining",
    address: "196 Miller St, North Sydney NSW 2060",
    url: "https://northsydneyliving.com.au/north-sydney-lunch-specials/",
    specialPrice: 59,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "north-sydney",
    categorySlug: "italian",
  },
  {
    title: "$25 flame-grilled cheeseburger with a drink",
    description: "A flame-grilled cheeseburger with crispy herbed fries and a choice of beer, house wine or soft drink, weekday afternoons.",
    venueName: "Poetica Bar and Grill",
    address: "Mezzanine Level, 1 Denison St, North Sydney NSW 2060",
    url: "https://northsydneyliving.com.au/north-sydney-lunch-specials/",
    specialPrice: 25,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "18:00",
    suburbSlug: "north-sydney",
    categorySlug: "pub-food",
  },
  {
    title: "$25 Vino & Pasta lunch",
    description: "A pasta main with salad, bread and a glass of wine, served all day at this Walker Street wine bar.",
    venueName: "Sol Bread and Wine",
    address: "Shop 2/168 Walker St, North Sydney NSW 2060",
    url: "https://northsydneyliving.com.au/north-sydney-lunch-specials/",
    specialPrice: 25,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    startTime: "12:00",
    suburbSlug: "north-sydney",
    categorySlug: "italian",
  },
  {
    title: "$25 bento lunch special",
    description: "A sashimi and nigiri set or a salmon miso yaki set, served with three seasonal sides.",
    venueName: "Genzo",
    address: "Shop 4/168 Walker St, North Sydney NSW 2060",
    url: "https://northsydneyliving.com.au/north-sydney-lunch-specials/",
    specialPrice: 25,
    availableDays: "Wed,Thu,Fri,Sat,Sun",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "north-sydney",
    categorySlug: "asian",
  },

  // ---------------- Pennant Hills ----------------
  {
    title: "$13.90 Thai lunch special",
    description: "A value fixed-price lunch special with a choice of chicken, beef, vegetable or tofu, at this South East Asian restaurant.",
    venueName: "The SEAT Hometaurant",
    address: "1/98 Yararra Rd, Pennant Hills NSW 2120",
    url: "https://www.theseat.com.au/",
    specialPrice: 13.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:30",
    suburbSlug: "pennant-hills",
    categorySlug: "asian",
  },

  // ---------------- Pymble ----------------
  {
    title: "$16 chicken schnitzel lunch",
    description: "Weekday lunch deal at the Pacific Highway pub: chicken schnitzel with chips and salad.",
    venueName: "Nightcap at Pymble Hotel",
    address: "1134 Pacific Highway, Pymble NSW 2073",
    url: "https://eatdrinkcheap.com.au/sydney/nightcap-at-pymble-hotel",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "pymble",
    categorySlug: "pub-food",
  },
  {
    title: "$16 cheeseburger with chips lunch",
    description: "Same weekday pub lunch deal, with a cheeseburger and chips option.",
    venueName: "Nightcap at Pymble Hotel",
    address: "1134 Pacific Highway, Pymble NSW 2073",
    url: "https://eatdrinkcheap.com.au/sydney/nightcap-at-pymble-hotel",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "pymble",
    categorySlug: "pub-food",
  },
  {
    title: "$18 rump steak lunch",
    description: "The steak option on the same weekday pub lunch deal: rump steak with chips and salad.",
    venueName: "Nightcap at Pymble Hotel",
    address: "1134 Pacific Highway, Pymble NSW 2073",
    url: "https://eatdrinkcheap.com.au/sydney/nightcap-at-pymble-hotel",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "pymble",
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

  console.log(`Seed complete. Created ${created} real North-region specials, authored by ${author.email}.`);
}

main().finally(() => prisma.$disconnect());
