import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/mail";
import { getDigestSpecialsForUser, meetsDigestThreshold } from "@/lib/digest";
import { getDigestSettings } from "@/lib/digestSettings";
import { z } from "zod";

const testSendSchema = z.object({
  mode: z.enum(["friday", "monday"]),
  suburbSlug: z.string().min(1),
  categorySlugs: z.array(z.string()).optional().default([]),
  email: z.string().email().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

// POST /api/admin/digest/test — sends a one-off digest right now, using the
// signed-in admin's own account for personalization (e.g. the Friday mode's
// "not already voted on" exclusion) but to whatever destination email is
// given. Doesn't touch the unsubscribe link's real token — a placeholder is
// used so clicking it in a test email can't actually unsubscribe anyone.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const adminId = (session.user as any).id as string;
  const adminEmail = (session.user as any).email as string;
  const adminName = (session.user as any).name as string | null;
  const { mode, suburbSlug, categorySlugs, email } = parsed.data;
  const destination = email || adminEmail;

  const suburb = await prisma.suburb.findUnique({ where: { slug: suburbSlug } });
  if (!suburb) {
    return NextResponse.json({ error: "Unknown suburb" }, { status: 400 });
  }

  const specials = await getDigestSpecialsForUser(adminId, suburb.id, categorySlugs, mode);

  if (!meetsDigestThreshold(specials)) {
    await prisma.digestLog.create({
      data: { mode: "test", totalEligible: 1, sent: 0, skipped: 1, failed: 0 },
    });
    return NextResponse.json(
      { error: `Not enough matching specials in ${suburb.name} to send a digest (need at least 2).` },
      { status: 400 }
    );
  }

  const settings = await getDigestSettings();
  const { subject, intro } = settings[mode];

  const ok = await sendDigestEmail(destination, {
    name: adminName || "there",
    unsubscribeToken: "test-preview-not-a-real-token",
    subject: `[TEST] ${subject}`,
    intro,
    specials,
  });

  await prisma.digestLog.create({
    data: { mode: "test", totalEligible: 1, sent: ok ? 1 : 0, skipped: 0, failed: ok ? 0 : 1 },
  });

  if (!ok) {
    return NextResponse.json({ error: "Failed to send — check RESEND_API_KEY is configured." }, { status: 502 });
  }

  return NextResponse.json({ success: true, sentTo: destination, itemCount: specials.length });
}
