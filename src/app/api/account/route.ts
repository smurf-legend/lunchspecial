import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const accountUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.name) {
    const existing = await prisma.user.findUnique({ where: { name: parsed.data.name } });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "That nickname is already taken" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, marketingOptIn: true },
  });

  return NextResponse.json({ user });
}
