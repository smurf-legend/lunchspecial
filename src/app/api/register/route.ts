import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { containsProfanity } from "@/lib/profanity";
import { sendNewSignupEmail } from "@/lib/mail";

const registerSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .refine((n) => !containsProfanity(n), { message: "That nickname isn't allowed" }),
  email: z.string().email(),
  password: z.string().min(8),
  marketingOptIn: z.boolean().optional().default(false),
  preferredSuburbSlug: z.string().optional(),
  preferredCategorySlugs: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, marketingOptIn, preferredSuburbSlug, preferredCategorySlugs } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  // Case-insensitive so "JohnDoe" and "johndoe" can't both be registered —
  // findUnique can't take a mode filter, so this needs findFirst.
  const existingName = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existingName) {
    return NextResponse.json({ error: "That nickname is already taken" }, { status: 409 });
  }

  let preferredSuburbId: string | undefined;
  if (preferredSuburbSlug) {
    const suburb = await prisma.suburb.findUnique({ where: { slug: preferredSuburbSlug } });
    if (!suburb) {
      return NextResponse.json({ error: "Unknown suburb" }, { status: 400 });
    }
    preferredSuburbId = suburb.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      marketingOptIn,
      preferredSuburbId,
      preferredCategorySlugs: preferredCategorySlugs ?? [],
    },
    select: { id: true, name: true, email: true },
  });

  await sendNewSignupEmail(user);

  return NextResponse.json({ user }, { status: 201 });
}
