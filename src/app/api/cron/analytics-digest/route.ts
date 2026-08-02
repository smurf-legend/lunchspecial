import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeeklyAnalyticsReport } from "@/lib/analyticsReport";
import { sendAnalyticsDigestEmail } from "@/lib/mail";

export const maxDuration = 60;

// GET /api/cron/analytics-digest — triggered by Vercel Cron (see
// vercel.json). Requires the shared CRON_SECRET, same as the lunch-deals
// digest cron, so this can't be hit publicly on demand.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await getWeeklyAnalyticsReport();
    const ok = await sendAnalyticsDigestEmail(report);
    // suburbsCovered is stored here (not just used from the report) so next
    // week's run has a baseline to diff against — see getWeeklyAnalyticsReport.
    await prisma.analyticsDigestLog.create({ data: { success: ok, suburbsCovered: report.suburbsCovered.value } });
    return NextResponse.json({ success: ok, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.analyticsDigestLog.create({ data: { success: false, error: message } });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
