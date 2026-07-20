import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/mail";
import { getDigestSpecialsForUser, meetsDigestThreshold, DigestMode } from "@/lib/digest";
import { getDigestSettings } from "@/lib/digestSettings";

export const maxDuration = 60;

// GET /api/cron/digest?mode=friday|monday — triggered by Vercel Cron (see
// vercel.json). Requires the shared CRON_SECRET so this can't be hit
// publicly to spam every opted-in user's inbox on demand.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const modeParam = req.nextUrl.searchParams.get("mode");
  if (modeParam !== "friday" && modeParam !== "monday") {
    return NextResponse.json({ error: "mode must be 'friday' or 'monday'" }, { status: 400 });
  }
  const mode = modeParam as DigestMode;

  const settings = await getDigestSettings();
  if (settings.paused) {
    await prisma.digestLog.create({
      data: { mode, totalEligible: 0, sent: 0, skipped: 0, failed: 0, paused: true },
    });
    return NextResponse.json({ mode, paused: true, totalEligible: 0, sent: 0, skipped: 0, failed: 0 });
  }

  const users = await prisma.user.findMany({
    where: { marketingOptIn: true, preferredSuburbId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      unsubscribeToken: true,
      preferredSuburbId: true,
      preferredCategorySlugs: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const { subject, intro } = settings[mode];

  for (const user of users) {
    const specials = await getDigestSpecialsForUser(
      user.id,
      user.preferredSuburbId!,
      user.preferredCategorySlugs,
      mode
    );

    if (!meetsDigestThreshold(specials)) {
      skipped++;
      continue;
    }

    const ok = await sendDigestEmail(user.email, {
      name: user.name,
      unsubscribeToken: user.unsubscribeToken,
      subject,
      intro,
      specials,
    });
    if (ok) sent++;
    else failed++;
  }

  await prisma.digestLog.create({
    data: { mode, totalEligible: users.length, sent, skipped, failed },
  });

  return NextResponse.json({ mode, totalEligible: users.length, sent, skipped, failed });
}
