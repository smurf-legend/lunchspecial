import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real, currently (as of July 2026) advertised lunch specials researched via
// web search for LunchSpecial's East-region Sydney coverage (Bondi /
// Coogee / Randwick / Vaucluse peninsula suburbs). Each entry is backed by a
// real venue and a source URL found during research — see `url` on each row.
// Descriptions are written in our own words, not copied from source
// marketing copy. Addresses are only included where an actual street
// address was found during research; otherwise left null rather than
// guessed.
//
// Several suburbs in the assigned list (Bellevue Hill, Bronte, Centennial
// Park, Dover Heights, Edgecliff, La Perouse, Point Piper, Queens Park,
// Rose Bay, Watsons Bay) turned up no venue with a genuine, price-specific
// lunch special after research and are intentionally omitted rather than
// padded with invented data.
//
// This script is additive and safe to re-run only once: Special rows are
// created fresh each run (no upsert key on Special), so re-running will
// duplicate rows.

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
  // ---------------- Bondi Beach ----------------
  {
    title: "$15 weekday lunch burger",
    description: "A beef burger from the pub's weekday lunch specials board, part of a rotating fixed-price lunch menu at this Bondi Road pub.",
    venueName: "The Royal Bondi",
    address: "283 Bondi Rd, Bondi",
    url: "https://merivale.com/venues/theroyal/menu/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "bondi-beach",
    categorySlug: "pub-food",
  },
  {
    title: "$20 rump steak lunch",
    description: "A 300g rump steak served as part of the same weekday lunch specials rotation at The Royal Bondi.",
    venueName: "The Royal Bondi",
    address: "283 Bondi Rd, Bondi",
    url: "https://merivale.com/venues/theroyal/menu/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "bondi-beach",
    categorySlug: "pub-food",
  },
  {
    title: "$15 chicken schnitzel lunch",
    description: "Crumbed chicken schnitzel offered at the same flat lunch price as the burger and other weekday specials.",
    venueName: "The Royal Bondi",
    address: "283 Bondi Rd, Bondi",
    url: "https://merivale.com/venues/theroyal/menu/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "bondi-beach",
    categorySlug: "pub-food",
  },

  // ---------------- Bondi Junction ----------------
  {
    title: "$15 pizza, pasta or salad + drink",
    description: "A small pizza, pasta or salad from a select lunch menu, plus a can of soft drink, at this Bondi Junction pizzeria.",
    venueName: "Arthur's Pizza",
    url: "https://www.arthurspizza.com.au/deals/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    endTime: "16:00",
    suburbSlug: "bondi-junction",
    categorySlug: "italian",
  },
  {
    title: "$18 members weekend roast",
    description: "A classic roast lunch served while stocks last over the weekend at the bistro inside the Easts Bondi Junction leagues club.",
    venueName: "Olive & Oak (Easts Bondi Junction)",
    url: "https://eastsbondijunction.com.au/whats-on/food-specials/",
    specialPrice: 18,
    availableDays: "Sat,Sun",
    startTime: "11:30",
    endTime: "14:30",
    suburbSlug: "bondi-junction",
    categorySlug: "pub-food",
  },

  // ---------------- Clovelly ----------------
  {
    title: "$20 weekday lunch special",
    description: "A fixed-price weekday lunch deal from the regular pub menu at the Clovelly Hotel, a short walk up from the beach.",
    venueName: "Clovelly Hotel",
    address: "381 Clovelly Rd, Clovelly",
    url: "https://www.clovellyhotel.com.au/menu",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "clovelly",
    categorySlug: "pub-food",
  },

  // ---------------- Coogee ----------------
  {
    title: "$20 any pizza (Pizza Mondays)",
    description: "Any pizza from the regular menu for one flat price, available for both lunch and dinner across the Coogee Bay Hotel.",
    venueName: "Coogee Bay Hotel",
    url: "https://coogeebayhotel.com.au/whats-on/weekly-food-specials",
    specialPrice: 20,
    availableDays: "Mon",
    suburbSlug: "coogee",
    categorySlug: "italian",
  },
  {
    title: "$20 Big Dog Tuesdays",
    description: "A 10-inch loaded frankfurter, part of the venue-wide weekly specials available at lunch and dinner at Coogee Bay Hotel.",
    venueName: "Coogee Bay Hotel",
    url: "https://coogeebayhotel.com.au/whats-on/weekly-food-specials",
    specialPrice: 20,
    availableDays: "Tue",
    suburbSlug: "coogee",
    categorySlug: "pub-food",
  },
  {
    title: "$28 steak frites Wednesdays",
    description: "A 250g butcher's cut steak with garlic butter and fries, offered at lunch and dinner as part of the weekly specials.",
    venueName: "Coogee Bay Hotel",
    url: "https://coogeebayhotel.com.au/whats-on/weekly-food-specials",
    specialPrice: 28,
    availableDays: "Wed",
    suburbSlug: "coogee",
    categorySlug: "pub-food",
  },
  {
    title: "$20 Schnitty Thursdays",
    description: "Chicken schnitzel with chips or mash, salad and gravy, part of the venue's weekly lunch-and-dinner specials.",
    venueName: "Coogee Bay Hotel",
    url: "https://coogeebayhotel.com.au/whats-on/weekly-food-specials",
    specialPrice: 20,
    availableDays: "Thu",
    suburbSlug: "coogee",
    categorySlug: "pub-food",
  },
  {
    title: "$21 fish burger Fridays",
    description: "A Japanese-inspired fish burger offered as the Friday entry in Coogee Bay Hotel's weekly lunch-and-dinner specials.",
    venueName: "Coogee Bay Hotel",
    url: "https://coogeebayhotel.com.au/whats-on/weekly-food-specials",
    specialPrice: 21,
    availableDays: "Fri",
    suburbSlug: "coogee",
    categorySlug: "asian",
  },

  // ---------------- Double Bay ----------------
  {
    title: "$20 Daily Favourites",
    description: "A rotating set of everyday-value mains served daily at the InterContinental Sydney Double Bay's bistro and bar.",
    venueName: "Bayside Bistro & Bar",
    address: "Shop 3/33 Cross St, Double Bay",
    url: "https://baysidebistro.com.au/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "double-bay",
    categorySlug: "pub-food",
  },

  // ---------------- Kensington ----------------
  {
    title: "$12.90 build-your-own bento box",
    description: "A customisable Chinese bento box built for a quick campus lunch at UNSW Kensington.",
    venueName: "Alleyway Kitchen",
    url: "https://alleywaykitchen.com.au/alleyway-kitchen-chinese-restaurant-in-kensington/",
    specialPrice: 12.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "kensington",
    categorySlug: "asian",
  },
  {
    title: "Sandwich or roll + coffee from $4",
    description: "A cheap combo of a sandwich or roll with coffee at the Lower Campus kiosk near the Village Green at UNSW.",
    venueName: "Home Ground Kiosk",
    url: "https://www.unsw.edu.au/student/student-life/news/2026/04/best-cheap-eats-unsw-campus",
    specialPrice: 4,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "kensington",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Kingsford ----------------
  {
    title: "$20 daily lunch special",
    description: "A different fixed-price meal each weekday, served across lunch hours at the Regent Hotel in Kingsford.",
    venueName: "Regent Hotel",
    url: "https://regenthotel.com.au/food-menu",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "kingsford",
    categorySlug: "pub-food",
  },
  {
    title: "$20 schnitzel lunch",
    description: "Chicken schnitzel at a fixed weekday lunch price, part of the Regent Hotel's regular midday offer.",
    venueName: "Regent Hotel",
    url: "https://regenthotel.com.au/food-menu",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "kingsford",
    categorySlug: "pub-food",
  },
  {
    title: "$22 rump steak Wednesdays",
    description: "A 250g grain-fed rump steak offered as the Wednesday lunch special at the Regent Hotel, Kingsford.",
    venueName: "Regent Hotel",
    url: "https://regenthotel.com.au/food-menu",
    specialPrice: 22,
    availableDays: "Wed",
    startTime: "12:00",
    endTime: "15:00",
    suburbSlug: "kingsford",
    categorySlug: "pub-food",
  },

  // ---------------- Malabar ----------------
  {
    title: "$16.50 lunch special",
    description: "A weekday lunch special blending Asian and Western dishes at the bistro inside Juniors Malabar.",
    venueName: "Bistro Rouge (Juniors Malabar)",
    url: "https://www.thejuniorsbistrorouge.com/menu",
    specialPrice: 16.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "malabar",
    categorySlug: "asian",
  },

  // ---------------- Maroubra ----------------
  {
    title: "$11 roast of the day",
    description: "A daily roast served at the beachfront bistro inside Maroubra Seals Sports & Community Club.",
    venueName: "Maroubra Seals",
    url: "https://maroubraseals.com.au/wp-content/uploads/2026/01/Brasserie-at-the-Seals-Lunch-Menu.pdf",
    specialPrice: 11,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "maroubra",
    categorySlug: "pub-food",
  },
  {
    title: "$10.50 Thai or Caesar salad",
    description: "A choice of Thai salad or Caesar salad from the lunch menu at Maroubra Seals' beachfront bistro.",
    venueName: "Maroubra Seals",
    url: "https://maroubraseals.com.au/wp-content/uploads/2026/01/Brasserie-at-the-Seals-Lunch-Menu.pdf",
    specialPrice: 10.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "maroubra",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Matraville ----------------
  {
    title: "$23 steak + all-you-can-eat frites",
    description: "A 200g sliced sirloin with skin-on fries and gravy, one per person, as a Monday special at the Matraville Hotel.",
    venueName: "Matraville Hotel",
    address: "Cnr Perry & Bunnerong Rds, Matraville",
    url: "https://www.matravillehotel.com.au/",
    specialPrice: 23,
    availableDays: "Mon",
    suburbSlug: "matraville",
    categorySlug: "pub-food",
  },

  // ---------------- North Bondi ----------------
  {
    title: "$55 two-course lunch",
    description: "A two-course seasonal seafood lunch set menu at this North Bondi beachfront restaurant, offered on select weekdays.",
    venueName: "North Bondi Fish",
    address: "120 Ramsgate Ave, North Bondi",
    url: "https://www.northbondifish.com.au/lets-lunch",
    specialPrice: 55,
    availableDays: "Mon,Thu,Fri",
    suburbSlug: "north-bondi",
    categorySlug: "pub-food",
  },

  // ---------------- Randwick ----------------
  {
    title: "$10 small pizza lunch",
    description: "A small pizza from the dedicated lunch menu at this long-running pizzeria in The Spot, Randwick.",
    venueName: "Arthur's Pizza (The Spot)",
    address: "47 Perouse Rd, Randwick",
    url: "https://www.weekendnotes.com/arthurs-pizza-the-spot-randwick/",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "randwick",
    categorySlug: "italian",
  },

  // ---------------- Tamarama ----------------
  {
    title: "Build-your-own lunch bowl (large) $22",
    description: "A large customisable lunch bowl at this Tamarama hill cafe, made in-house and popular with the weekday lunch crowd.",
    venueName: "M Deli Cafe Tamarama",
    url: "https://www.instagram.com/mdelitamarama/?hl=en",
    specialPrice: 22,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "06:00",
    endTime: "14:30",
    suburbSlug: "tamarama",
    categorySlug: "poke-salad-bowls",
  },

  // ---------------- Vaucluse ----------------
  {
    title: "$30 two-course set lunch",
    description: "A two-course set lunch menu at the heritage tearooms within the Vaucluse House estate grounds.",
    venueName: "Vaucluse House Tearooms",
    address: "Wentworth Rd, Vaucluse",
    url: "https://www.estatevauclusehouse.com.au/",
    specialPrice: 30,
    availableDays: "Wed,Thu,Fri,Sat,Sun",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "vaucluse",
    categorySlug: "cafe",
  },

  // ---------------- Waverley ----------------
  {
    title: "$20 lunch special",
    description: "Choice of one entree — rump steak, spaghetti bolognaise or a roasted veggie pizza — plus a drink and ice cream for dessert.",
    venueName: "Charing Cross Hotel",
    url: "https://www.charingcrosshotel.com.au/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "waverley",
    categorySlug: "pub-food",
  },

  // ---------------- Woollahra ----------------
  {
    title: "$20 Monday Dumplings",
    description: "A mixed dozen dumplings served in the Front Bar every Monday at this modern-Asian leaning Eastern Suburbs pub.",
    venueName: "Woollahra Hotel",
    address: "116 Queen St, Woollahra",
    url: "https://www.woollahrahotel.com.au/whats-on/monday-dumplings/",
    specialPrice: 20,
    availableDays: "Mon",
    suburbSlug: "woollahra",
    categorySlug: "asian",
  },
  {
    title: "$20 katsu chicken schnitzel Tuesdays",
    description: "Katsu chicken schnitzel (or $25 for the parmigiana version) on Tuesdays at the Woollahra Hotel.",
    venueName: "Woollahra Hotel",
    address: "116 Queen St, Woollahra",
    url: "https://www.woollahrahotel.com.au/whats-on/schnitzu-tuesdays/",
    specialPrice: 20,
    availableDays: "Tue",
    suburbSlug: "woollahra",
    categorySlug: "pub-food",
  },
];

async function main() {
  const author = await prisma.user.findUniqueOrThrow({
    where: { email: "team@lunchspecial.com.au" },
  });

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

  console.log(`Seed complete. Created ${created} real East-region specials, authored by ${author.email}.`);
}

main().finally(() => prisma.$disconnect());
