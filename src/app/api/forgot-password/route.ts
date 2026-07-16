import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import crypto from "crypto";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// POST /api/forgot-password — body: { email }
// Always returns success regardless of whether the email exists, so this
// can't be used to probe which emails have accounts (standard practice for
// this kind of endpoint).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({ success: true });
}
