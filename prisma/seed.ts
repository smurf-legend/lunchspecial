import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Starting suburb list — inner Sydney to start. Add more rows here (or a
// CSV import) to expand coverage; no schema change needed.
const SYDNEY_SUBURBS = [
  { name: "Surry Hills", postcode: "2010", region: "Central" },
  { name: "Newtown", postcode: "2042", region: "Central" },
  { name: "Bondi", postcode: "2026", region: "East" },
  { name: "CBD", postcode: "2000", region: "Central" },
  { name: "Chippendale", postcode: "2008", region: "Central" },
  { name: "Marrickville", postcode: "2204", region: "Central" },
  { name: "Parramatta", postcode: "2150", region: "West" },
  { name: "Chatswood", postcode: "2067", region: "North" },
  { name: "Manly", postcode: "2095", region: "North" },
  { name: "Redfern", postcode: "2016", region: "Central" },
];

const CATEGORIES = [
  "Asian",
  "Cafe",
  "Pub Food",
  "Italian",
  "Vegan/Vegetarian",
  "Middle Eastern",
  "Sandwiches/Rolls",
  "Poke/Salad Bowls",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  for (const s of SYDNEY_SUBURBS) {
    await prisma.suburb.upsert({
      where: { slug: slugify(s.name) },
      update: {},
      create: { name: s.name, postcode: s.postcode, state: "NSW", region: s.region, slug: slugify(s.name) },
    });
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@lunchspecial.com.au" },
    update: {},
    create: { name: "Demo User", email: "demo@lunchspecial.com.au", passwordHash },
  });

  const surryHills = await prisma.suburb.findUniqueOrThrow({ where: { slug: "surry-hills" } });
  const asian = await prisma.category.findUniqueOrThrow({ where: { slug: "asian" } });

  await prisma.special.create({
    data: {
      title: "$12 banh mi + drink combo",
      description: "Crispy pork roll, pate, pickled veg, plus a can of soft drink. Cash only, cash discount applies.",
      venueName: "Bánh Mi Corner",
      address: "12 Crown St, Surry Hills",
      specialPrice: 12,
      usualPrice: 15,
      availableDays: "Mon,Tue,Wed,Thu,Fri",
      startTime: "11:30",
      endTime: "14:00",
      authorId: demoUser.id,
      suburbs: { create: [{ suburb: { connect: { id: surryHills.id } } }] },
      categories: { create: [{ category: { connect: { id: asian.id } } }] },
    },
  });

  console.log("Seed complete. Demo login: demo@lunchspecial.com.au / password123");
}

main().finally(() => prisma.$disconnect());
