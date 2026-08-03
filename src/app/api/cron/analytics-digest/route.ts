import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeeklyAnalyticsReport } from "@/lib/analyticsReport";
import { sendAnalyticsDigestEmail } from "@/lib/mail";
import { createAnalyticsReportDoc } from "@/lib/analyticsReportDoc";
import { appendWeeklyMetricsRow } from "@/lib/analyticsSheet";

export const maxDuration = 60;

function dateRangeLabel(): { label: string; weekEnding: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return { label: `${fmt(start)} – ${fmt(end)}`, weekEnding: fmt(end) };
}

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
    const { label, weekEnding } = dateRangeLabel();

    // Doc and Sheet both need the Google account OAuth connection — if it's
    // not connected yet, createAnalyticsReportDoc/appendWeeklyMetricsRow
    // return null rather than throwing, so the email digest still goes out.
    const [ok, doc, sheet] = await Promise.all([
      sendAnalyticsDigestEmail(report),
      createAnalyticsReportDoc(report, label),
      appendWeeklyMetricsRow(report, weekEnding),
    ]);

    // suburbsCovered is stored here (not just used from the report) so next
    // week's run has a baseline to diff against — see getWeeklyAnalyticsReport.
    await prisma.analyticsDigestLog.create({ data: { success: ok, suburbsCovered: report.suburbsCovered.value } });
    return NextResponse.json({ success: ok, report, doc, sheet });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.analyticsDigestLog.create({ data: { success: false, error: message } });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
