import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendTipSubmissionEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const tipSchema = z.object({
  details: z.string().trim().min(1, "Tell us at least a little about it").max(2000),
  link: z.string().trim().url().max(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  // Hidden field real users never fill in — a bot filling every field on the
  // form trips it. No CAPTCHA/login needed for a form this low-stakes.
  company: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`tips:${getClientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many submissions — try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = tipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.company) {
    // Honeypot tripped — pretend success so the bot doesn't learn anything.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const submission = await prisma.specialSubmission.create({
    data: {
      details: parsed.data.details,
      link: parsed.data.link || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  await sendTipSubmissionEmail(submission.details, submission.link, submission.imageUrl);

  return NextResponse.json({ ok: true }, { status: 201 });
}
