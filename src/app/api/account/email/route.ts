import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  if (parsed.data.newEmail === user.email) {
    return NextResponse.json({ error: "That's already your email address" }, { status: 409 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } });
  if (existing) {
    return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: parsed.data.newEmail },
    select: { id: true, email: true },
  });

  return NextResponse.json({ user: updated });
}
