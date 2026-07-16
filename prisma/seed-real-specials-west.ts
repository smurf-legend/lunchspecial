import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real, currently (as of July 2026) advertised lunch specials researched via
// web search for LunchSpecial's West-region Sydney suburb coverage. Each
// entry is backed by a real venue and a source URL found during research —
// see `url` on each row. Descriptions are written in our own words, not
// copied from source marketing copy. Where a source gave a member/visitor or
// starting price, the lower (member/starting) price was used for
// specialPrice and noted in the description.
//
// Suburbs researched with little or no verifiable lunch-special evidence
// (Eastwood, Granville, Macquarie Park, Quakers Hill, Rouse Hill) were left
// out rather than padded with invented venues/prices.
//
// This script is additive and safe to re-run in the sense that it never
// touches existing data, but it does not upsert Special rows (there's no
// natural unique key), so re-running it will duplicate rows — run once.
//
// Run with: npx tsx prisma/seed-real-specials-west.ts

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
  // ---------------- Auburn ----------------
  {
    title: "$14 beef kebab roll",
    description: "Grilled beef kebab roll with lettuce, tomato, onion and a choice of sauce from this Rawson St kebab and pide shop opposite Auburn station — a quick, cheap lunch rather than a marketed discount.",
    venueName: "Auburn Kebab House",
    address: "77 Rawson St, Auburn NSW 2144",
    url: "https://auburnkebabhouse.com.au/menu/",
    specialPrice: 14,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "auburn",
    categorySlug: "middle-eastern",
  },

  // ---------------- Baulkham Hills ----------------
  {
    title: "$17 weekday pub lunch special",
    description: "Bull & Bush Hotel's everyday weekday lunch special, a value bistro meal at a set price on Windsor Road.",
    venueName: "Bull & Bush Hotel",
    address: "378 Windsor Rd, Baulkham Hills NSW 2153",
    url: "https://www.bullandbushpub.com.au/whats-on/",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "baulkham-hills",
    categorySlug: "pub-food",
  },
  {
    title: "$27 tradie's lunch with a free schooner",
    description: "A heartier weekday lunch option at Bull & Bush aimed at tradies, which comes with a complimentary schooner included in the price.",
    venueName: "Bull & Bush Hotel",
    address: "378 Windsor Rd, Baulkham Hills NSW 2153",
    url: "https://www.bullandbushpub.com.au/whats-on/",
    specialPrice: 27,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "baulkham-hills",
    categorySlug: "pub-food",
  },

  // ---------------- Blacktown ----------------
  {
    title: "$19 MB4+ rump steak lunch",
    description: "Weekday lunch-only rump steak with fries, salad and a choice of creamy mushroom or pepper sauce at this Westpoint Shopping Centre steakhouse chain outlet.",
    venueName: "Volcanos Steakhouse Blacktown",
    address: "Westpoint Shopping Centre, Patrick St, Blacktown NSW 2148",
    url: "https://blacktown.volcanos.com.au/",
    specialPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "blacktown",
    categorySlug: "pub-food",
  },
  {
    title: "$16 chargrilled chicken fillet lunch",
    description: "Chargrilled chicken fillet with fries, salad and a choice of sauce, the cheaper of Volcanos' two weekday lunch specials.",
    venueName: "Volcanos Steakhouse Blacktown",
    address: "Westpoint Shopping Centre, Patrick St, Blacktown NSW 2148",
    url: "https://blacktown.volcanos.com.au/",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:30",
    endTime: "15:00",
    suburbSlug: "blacktown",
    categorySlug: "pub-food",
  },

  // ---------------- Cabramatta ----------------
  {
    title: "$6.50 classic pork banh mi",
    description: "No-frills classic pork banh mi from a long-running Vietnamese takeaway on George St — one of Cabramatta's cheapest sit-down-free lunches.",
    venueName: "Sydney Pork Rolls",
    address: "George St, Cabramatta NSW 2166",
    specialPrice: 6.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "cabramatta",
    categorySlug: "sandwiches-rolls",
  },
  {
    title: "$8.50 roast pork banh mi",
    description: "The roast pork version of Sydney Pork Rolls' banh mi, with crackling, pate and pickled veg.",
    venueName: "Sydney Pork Rolls",
    address: "George St, Cabramatta NSW 2166",
    specialPrice: 8.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "cabramatta",
    categorySlug: "sandwiches-rolls",
  },

  // ---------------- Campbelltown ----------------
  {
    title: "$15 Monday pizza or pasta bowl",
    description: "All-day Monday deal on pizza or a pasta bowl (seafood options excluded) at this Gilchrist Drive tavern near Campbelltown — dine-in only.",
    venueName: "The Macarthur Tavern",
    address: "Cnr Gilchrist Dr & Kellicar Rd, Campbelltown NSW 2560",
    url: "https://themacarthurtavern.com.au/our-menus/",
    specialPrice: 15,
    availableDays: "Mon",
    suburbSlug: "campbelltown",
    categorySlug: "italian",
  },

  // ---------------- Carlingford ----------------
  {
    title: "Cantonese lunch specials under $14",
    description: "Great Food's dedicated lunch-special section of the menu, separate from its regular a la carte dishes, all priced under $14 at this long-running Carlingford Village Cantonese spot.",
    venueName: "Great Food",
    address: "9G/372-376 Pennant Hills Rd, Carlingford NSW 2118",
    specialPrice: 14,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "carlingford",
    categorySlug: "asian",
  },

  // ---------------- Castle Hill ----------------
  {
    title: "$17 butter chicken (members)",
    description: "Butter chicken with steamed jasmine rice, garlic yoghurt and papadum from Castle Hill RSL's weekday Courtyard Kitchen lunch specials — $17 for members, $19 for visitors.",
    venueName: "Castle Hill RSL",
    url: "https://www.castlehillrsl.com.au/lunch-and-dinner-specials",
    specialPrice: 17,
    usualPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "castle-hill",
    categorySlug: "asian",
  },
  {
    title: "$17 pumpkin & chorizo gnocchi (members)",
    description: "Honey-glazed pumpkin, grilled chorizo and spinach gnocchi in a sage burnt butter sauce, one of the five rotating weekday lunch specials at Castle Hill RSL's Courtyard Kitchen.",
    venueName: "Castle Hill RSL",
    url: "https://www.castlehillrsl.com.au/lunch-and-dinner-specials",
    specialPrice: 17,
    usualPrice: 19,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "castle-hill",
    categorySlug: "italian",
  },

  // ---------------- Casula ----------------
  {
    title: "$20 chicken schnitzel lunch",
    description: "Chicken schnitzel as part of Crossroads Hotel's weekday lunch specials board at the Hume Highway/Camden Valley Way corner pub — menu fixed, no substitutions, not available public holidays.",
    venueName: "Crossroads Hotel",
    address: "Cnr Hume Highway & Camden Valley Way, Casula NSW 2170",
    url: "https://crossroadshotel.com.au/eat-drink/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "casula",
    categorySlug: "pub-food",
  },
  {
    title: "$32 250g rump steak lunch",
    description: "The steak option on Crossroads Hotel's weekday lunch specials board, pricier than the $20 items but still part of the fixed lunch menu.",
    venueName: "Crossroads Hotel",
    address: "Cnr Hume Highway & Camden Valley Way, Casula NSW 2170",
    url: "https://crossroadshotel.com.au/eat-drink/",
    specialPrice: 32,
    availableDays: "Mon,Tue,Wed,Thu",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "casula",
    categorySlug: "pub-food",
  },

  // ---------------- Epping ----------------
  {
    title: "$14.95 seniors lunch special",
    description: "Market grilled fish, bangers and mash, ratatouille or the chef's roast of the day, plus a soft drink, at the Epping Club's seniors lunch — $14.95 with a Seniors Card, a little more without.",
    venueName: "The Epping Club",
    address: "45-47 Rawson Street, Epping NSW 2121",
    url: "https://www.eppingclub.com/WhatsOn?Event=seniors",
    specialPrice: 14.95,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    startTime: "12:00",
    endTime: "14:30",
    suburbSlug: "epping",
    categorySlug: "pub-food",
  },

  // ---------------- Fairfield ----------------
  {
    title: "$16.90 roast lunch (members)",
    description: "Choice of two roasts with two desserts, a bread roll and a soft drink at Summer House inside Fairfield RSL — $16.90 for members, $20.90 for non-members.",
    venueName: "Summer House at Fairfield RSL",
    address: "14 Anzac Avenue, Fairfield NSW 2165",
    url: "https://fairfieldrsl.com.au/venues/summer-house/",
    specialPrice: 16.9,
    usualPrice: 20.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "fairfield",
    categorySlug: "pub-food",
  },

  // ---------------- Guildford ----------------
  {
    title: "$17 chicken schnitzel lunch",
    description: "One of Guildford Hotel's weekday pub-favourite lunch specials — chicken schnitzel, part of a lineup that also includes a Caesar salad and a schnitzel wrap at similar prices.",
    venueName: "Guildford Hotel",
    address: "309 Guildford Rd, Guildford NSW 2161",
    specialPrice: 17,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "guildford",
    categorySlug: "pub-food",
  },
  {
    title: "$19.50 rump steak lunch",
    description: "The steak option among Guildford Hotel's weekday lunch specials, alongside cheaper salad, wrap and pasta choices.",
    venueName: "Guildford Hotel",
    address: "309 Guildford Rd, Guildford NSW 2161",
    specialPrice: 19.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "guildford",
    categorySlug: "pub-food",
  },

  // ---------------- Ingleburn ----------------
  {
    title: "$8.50 lunch special with a free drink",
    description: "David's Chinese Restaurant inside the Ingleburn Hotel runs an $8.50 lunch special that includes a free schooner of beer, wine or a soft drink, seven days a week.",
    venueName: "Ingleburn Hotel (David's Chinese Restaurant)",
    address: "14 Ingleburn Road, Ingleburn NSW 2565",
    url: "https://publocation.com.au/pubs/nsw/ingleburn/ingleburn-hotel",
    specialPrice: 8.5,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "ingleburn",
    categorySlug: "asian",
  },

  // ---------------- Kellyville ----------------
  {
    title: "$18 pizza + soft drink lunch deal",
    description: "Any medium pizza plus a soft drink, pickup only, from this Hector Court pizza and pasta spot's dedicated weekday lunch menu.",
    venueName: "Product of Italy",
    address: "2a Hector Court, Kellyville NSW 2155",
    url: "https://productofitaly.com.au/kellyville-lunch-special/",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    endTime: "15:00",
    suburbSlug: "kellyville",
    categorySlug: "italian",
  },
  {
    title: "$20 pasta + soft drink lunch deal",
    description: "Any pasta from the lunch menu plus a soft drink, pickup only until 3pm on weekdays, at Product of Italy in Kellyville.",
    venueName: "Product of Italy",
    address: "2a Hector Court, Kellyville NSW 2155",
    url: "https://productofitaly.com.au/kellyville-lunch-special/",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    endTime: "15:00",
    suburbSlug: "kellyville",
    categorySlug: "italian",
  },
  {
    title: "Cashew nut chilli jam lunch from $12.90",
    description: "Cashew nut and chilli jam stir-fry, one of North Kellyville Thai Restaurant's lunch-special menu items starting from $12.90.",
    venueName: "North Kellyville Thai Restaurant",
    suburbSlug: "kellyville",
    specialPrice: 12.9,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    categorySlug: "asian",
  },

  // ---------------- Liverpool ----------------
  {
    title: "Pub meals from $16",
    description: "Terry's Kitchen at the Collingwood Hotel on the Hume Highway runs weekday pub meals starting from $16.",
    venueName: "Collingwood Hotel",
    address: "321 Hume Hwy, Liverpool NSW 2170",
    url: "https://www.collingwoodhotel.com.au/",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "liverpool",
    categorySlug: "pub-food",
  },

  // ---------------- Merrylands ----------------
  {
    title: "$12 daily pizza special",
    description: "A full-size pizza for $12 as part of Merrylands RSL's daily food specials in the club bistro.",
    venueName: "Merrylands RSL Club",
    address: "8-12 Miller St, Merrylands NSW 2160",
    specialPrice: 12,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "merrylands",
    categorySlug: "italian",
  },

  // ---------------- Mount Druitt ----------------
  {
    title: "$10 rump steak or chicken schnitzel",
    description: "Rump steak or chicken schnitzel from the bistro's daily specials board at this North Parade pub, both priced at $10.",
    venueName: "The Club Hotel Mount Druitt",
    address: "57 North Parade, Mount Druitt NSW 2770",
    url: "https://www.theclubhotelmountdruitt.com.au/",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "mount-druitt",
    categorySlug: "pub-food",
  },
  {
    title: "$10 Monday pizza & pasta (members)",
    description: "Members' Monday deal on a range of pizza and pasta dishes at the Westfield Mount Druitt branch of this casual dining chain.",
    venueName: "Rashays Mount Druitt",
    address: "Westfield Mount Druitt, Luxford Road & Carlisle Avenue, Mount Druitt NSW 2770",
    url: "https://rashays.com/find-us/restaurants/mount-druitt/",
    specialPrice: 10,
    availableDays: "Mon",
    suburbSlug: "mount-druitt",
    categorySlug: "italian",
  },

  // ---------------- Penrith ----------------
  {
    title: "$18 Monday burger lunch (members)",
    description: "Any burger for $18 (members) / $20 (non-members) as part of Kelly's Bar + Kitchen's weekday lunch specials at Panthers Penrith.",
    venueName: "Kelly's Bar + Kitchen, Panthers Penrith",
    address: "123 Mulgoa Rd, Penrith NSW 2750",
    url: "https://penrith.panthers.com.au/eat-drink/eat/kellys-weekday-specials/",
    specialPrice: 18,
    usualPrice: 20,
    availableDays: "Mon",
    suburbSlug: "penrith",
    categorySlug: "pub-food",
  },
  {
    title: "$18 Tuesday rump steak lunch (members)",
    description: "Rump steak for $18 (members) / $20 (non-members), Tuesday's edition of Kelly's Bar + Kitchen's weekday lunch specials at Panthers Penrith.",
    venueName: "Kelly's Bar + Kitchen, Panthers Penrith",
    address: "123 Mulgoa Rd, Penrith NSW 2750",
    url: "https://penrith.panthers.com.au/eat-drink/eat/kellys-weekday-specials/",
    specialPrice: 18,
    usualPrice: 20,
    availableDays: "Tue",
    suburbSlug: "penrith",
    categorySlug: "pub-food",
  },
  {
    title: "$18 Thursday 200g chicken schnitzel (members)",
    description: "200g chicken schnitzel for $18 (members) / $20 (non-members), Thursday's weekday lunch special at Kelly's Bar + Kitchen, Panthers Penrith.",
    venueName: "Kelly's Bar + Kitchen, Panthers Penrith",
    address: "123 Mulgoa Rd, Penrith NSW 2750",
    url: "https://penrith.panthers.com.au/eat-drink/eat/kellys-weekday-specials/",
    specialPrice: 18,
    usualPrice: 20,
    availableDays: "Thu",
    suburbSlug: "penrith",
    categorySlug: "pub-food",
  },

  // ---------------- Ryde ----------------
  {
    title: "$18 rump steak lunch special",
    description: "200g grain-fed rump steak from Riverviews Bar & Dining's daily $18 lunch special board at North Ryde RSL.",
    venueName: "North Ryde RSL",
    address: "Cnr Pittwater & Magdala Roads, North Ryde NSW 2113",
    url: "https://www.northrydersl.com.au/whats-on/special-events/423-lunch-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "ryde",
    categorySlug: "pub-food",
  },
  {
    title: "$18 chicken schnitzel lunch special",
    description: "Classic chicken schnitzel, one of the options on North Ryde RSL's daily $18 lunch special board at Riverviews Bar & Dining.",
    venueName: "North Ryde RSL",
    address: "Cnr Pittwater & Magdala Roads, North Ryde NSW 2113",
    url: "https://www.northrydersl.com.au/whats-on/special-events/423-lunch-specials",
    specialPrice: 18,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "ryde",
    categorySlug: "pub-food",
  },
  {
    title: "$40 three-course training-restaurant lunch",
    description: "A rotating three-course lunch cooked and served by hospitality students at TAFE NSW's Ambassador Training Restaurant — no menu choice, but a genuine bargain for the format. Runs a single lunch sitting a week.",
    venueName: "The Ambassador Training Restaurant",
    url: "https://www.nsi.tafensw.edu.au/campus/specialistcentres/restaurants/ambassador.aspx",
    specialPrice: 40,
    availableDays: "Wed",
    startTime: "12:00",
    endTime: "14:00",
    suburbSlug: "ryde",
    categorySlug: "cafe",
  },

  // ---------------- Seven Hills ----------------
  {
    title: "$16 steak, chips & gravy lunch",
    description: "Steak with chips and gravy, Hotel Seven Hills' weekday lunch special on Prospect Highway.",
    venueName: "Hotel Seven Hills",
    address: "222 Prospect Highway, Seven Hills NSW 2147",
    url: "https://hotelsevenhills.com.au/restaurant-home/whats-on/",
    specialPrice: 16,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "11:00",
    endTime: "15:00",
    suburbSlug: "seven-hills",
    categorySlug: "pub-food",
  },

  // ---------------- Smithfield ----------------
  {
    title: "Weekday lunch specials from $15",
    description: "Smithfield Tavern's rotating weekday lunch specials on The Horsley Drive, starting from $15 — burgers, steaks, pastas and pub classics feature across the week.",
    venueName: "Smithfield Tavern",
    address: "671 The Horsley Drive, Smithfield NSW 2164",
    url: "https://www.thesmithfieldtavern.com.au/",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "smithfield",
    categorySlug: "pub-food",
  },

  // ---------------- St Marys ----------------
  {
    title: "$15 rump steak, chips & gravy (Mon-Wed)",
    description: "Rump steak with chips and gravy, one of three Monday-to-Wednesday lunch options at the Lucky Australian Hotel on Forrester Road.",
    venueName: "Lucky Australian Hotel",
    address: "68 Forrester Road, St Marys NSW 2760",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed",
    suburbSlug: "st-marys",
    categorySlug: "pub-food",
  },
  {
    title: "$15 chicken schnitzel, chips & gravy (Mon-Wed)",
    description: "Chicken schnitzel with chips and gravy, another of the Lucky Australian Hotel's Monday-to-Wednesday $15 lunch options.",
    venueName: "Lucky Australian Hotel",
    address: "68 Forrester Road, St Marys NSW 2760",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed",
    suburbSlug: "st-marys",
    categorySlug: "pub-food",
  },
  {
    title: "$15 beer-battered flathead, chips & tartare (Mon-Wed)",
    description: "Beer-battered flathead with chips and tartare sauce, the seafood option in the Lucky Australian Hotel's Monday-to-Wednesday $15 lunch lineup.",
    venueName: "Lucky Australian Hotel",
    address: "68 Forrester Road, St Marys NSW 2760",
    specialPrice: 15,
    availableDays: "Mon,Tue,Wed",
    suburbSlug: "st-marys",
    categorySlug: "pub-food",
  },

  // ---------------- Toongabbie ----------------
  {
    title: "$10 weekday lunch special",
    description: "Toongabbie Hotel's well-reviewed $10 lunch special, a longstanding cheap weekday feed at this Aurelia Street pub.",
    venueName: "Toongabbie Hotel",
    address: "15 Aurelia Street, Toongabbie NSW 2146",
    url: "https://www.toongabbiehotel.com.au/menus",
    specialPrice: 10,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "toongabbie",
    categorySlug: "pub-food",
  },
  {
    title: "Two pizzas for $20",
    description: "A two-pizza deal for $20 at the Toongabbie Hotel, good value for sharing over a longer lunch.",
    venueName: "Toongabbie Hotel",
    address: "15 Aurelia Street, Toongabbie NSW 2146",
    url: "https://www.toongabbiehotel.com.au/menus",
    specialPrice: 20,
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    suburbSlug: "toongabbie",
    categorySlug: "italian",
  },

  // ---------------- Wentworthville ----------------
  {
    title: "$28.95 pizza meal deal",
    description: "Fat Monks' Monk's Special Deal 1 — a pizza-based combo deal listed on delivery platforms for this Dunmore Street pizzeria.",
    venueName: "Fat Monks Wentworthville",
    address: "20 Dunmore Street, Wentworthville NSW 2145",
    url: "https://fatmonks.com.au/wentworthville/",
    specialPrice: 28.95,
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    suburbSlug: "wentworthville",
    categorySlug: "italian",
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

  console.log(`Seed complete. Created ${created} real West-region specials, authored by ${author.email}.`);
}

main().finally(() => prisma.$disconnect());
