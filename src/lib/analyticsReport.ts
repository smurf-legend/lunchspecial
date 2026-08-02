import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// Google's PEM key can arrive with either real newlines (if the env var was
// set that way, e.g. via `vercel env add` piping actual line breaks) or
// literal "\n" escape sequences (the more common way to fit a multi-line
// key into a single .env line) — different env-loading mechanisms handle
// this inconsistently, so normalize defensively rather than assume one form.
function getAuth() {
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });
}

// A value plus its week-over-week percent change — null when there's no
// previous-period baseline to compare against (e.g. previous period was 0,
// where a percent change is either undefined or wildly misleading).
export type Trend = { value: number; changePct: number | null };
// Same idea but for metrics where a percentage-point delta is more
// meaningful than a percent change — average position (already a small
// number where "position 5 -> 4" reads better as "-1.0" than "-20%") and
// suburb coverage (small integers where "+3" beats "+50%").
export type DeltaTrend = { value: number; change: number | null };

export type AnalyticsReport = {
  // The metrics actually worth watching to know whether SEO effort is
  // working (decided after a discussion about what "made an improvement"
  // should even mean for this site) — trend, not just a snapshot.
  organicSessions: Trend;
  totalSessions: Trend;
  activeUsers: Trend;
  engagementRate: Trend; // percentage, e.g. 42.3
  suburbsCovered: DeltaTrend; // suburbs with >=1 real local special — the thing actually in our control
  searchClicks: Trend;
  searchImpressions: Trend;
  avgPosition: DeltaTrend; // lower is better
  avgCtr: Trend; // percentage

  // Supporting detail — useful context, not headline numbers.
  topPages: { path: string; sessions: number }[];
  topSources: { source: string; sessions: number }[];
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
};

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Search Console's data lags a few days behind real-time (Google's own
// documented delay), so "the last 7 days" as of today would mostly return
// zeros for the most recent days — end the range a few days back instead of
// at today for numbers that are actually complete.
const SEARCH_CONSOLE_LAG_DAYS = 3;

export async function getWeeklyAnalyticsReport(): Promise<AnalyticsReport> {
  const auth = getAuth();
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth });
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;

  // Two date ranges in one request, distinguished by the "dateRange"
  // pseudo-dimension — GA4's own built-in way to get a week-over-week
  // comparison without a second round trip or our own history table
  // (unlike suburb coverage below, which has no such feature to lean on).
  const dateRanges = [
    { name: "current", startDate: "7daysAgo", endDate: "today" },
    { name: "previous", startDate: "14daysAgo", endDate: "8daysAgo" },
  ];

  const [totals, organic, pages, sources] = await Promise.all([
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "engagementRate" }],
      },
    }),
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensionFilter: {
          filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { value: "Organic Search" } },
        },
        metrics: [{ name: "sessions" }],
      },
    }),
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "5",
      },
    }),
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "5",
      },
    }),
  ]);

  // GA4 rejects `dateRange` as an explicit output dimension ("can be used
  // in a Pivot or OrderBy... does not need to be listed in the
  // Dimensions") — without it, rows just come back in the same order as
  // the `dateRanges` array we sent, one row per range.
  const rowFor = (report: typeof totals, rangeIndex: 0 | 1) => report.data.rows?.[rangeIndex];

  const curTotals = rowFor(totals, 0);
  const prevTotals = rowFor(totals, 1);
  const curSessions = Number(curTotals?.metricValues?.[0]?.value ?? 0);
  const prevSessions = Number(prevTotals?.metricValues?.[0]?.value ?? 0);
  const curActiveUsers = Number(curTotals?.metricValues?.[1]?.value ?? 0);
  const prevActiveUsers = Number(prevTotals?.metricValues?.[1]?.value ?? 0);
  const curEngagementRate = Number(curTotals?.metricValues?.[2]?.value ?? 0) * 100;
  const prevEngagementRate = Number(prevTotals?.metricValues?.[2]?.value ?? 0) * 100;

  const curOrganic = Number(rowFor(organic, 0)?.metricValues?.[0]?.value ?? 0);
  const prevOrganic = Number(rowFor(organic, 1)?.metricValues?.[0]?.value ?? 0);

  const topPages = (pages.data.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const topSources = (sources.data.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  // ---- Search Console: current period, previous period, top queries ----
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL!;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const curEnd = new Date();
  curEnd.setDate(curEnd.getDate() - SEARCH_CONSOLE_LAG_DAYS);
  const curStart = new Date(curEnd);
  curStart.setDate(curStart.getDate() - 7);

  const prevEnd = new Date(curStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 7);

  const [curSearchTotals, prevSearchTotals, queriesQuery] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(curStart), endDate: fmt(curEnd) },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(prevStart), endDate: fmt(prevEnd) },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(curStart), endDate: fmt(curEnd), dimensions: ["query"], rowLimit: 5 },
    }),
  ]);

  const curSearchRow = curSearchTotals.data.rows?.[0];
  const prevSearchRow = prevSearchTotals.data.rows?.[0];
  const curClicks = curSearchRow?.clicks ?? 0;
  const prevClicks = prevSearchRow?.clicks ?? 0;
  const curImpressions = curSearchRow?.impressions ?? 0;
  const prevImpressions = prevSearchRow?.impressions ?? 0;
  const curPosition = curSearchRow?.position ?? 0;
  const prevPosition = prevSearchRow?.position ?? 0;
  const curCtr = (curSearchRow?.ctr ?? 0) * 100;
  const prevCtr = (prevSearchRow?.ctr ?? 0) * 100;

  const topQueries = (queriesQuery.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position: r.position ?? 0,
  }));

  // ---- Suburb coverage: the one metric that's ours, not Google's — same
  // "has a real local special" definition used for the sitemap/noindex
  // logic (src/lib/liveStates.ts and the suburb page's generateMetadata),
  // so this number always matches what's actually indexable right now.
  const [suburbsCoveredNow, lastLoggedRun] = await Promise.all([
    prisma.suburb.count({ where: { specials: { some: { special: { hidden: false, needsReview: false } } } } }),
    prisma.analyticsDigestLog.findFirst({
      where: { suburbsCovered: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { suburbsCovered: true },
    }),
  ]);
  const suburbsCoveredChange =
    lastLoggedRun?.suburbsCovered != null ? suburbsCoveredNow - lastLoggedRun.suburbsCovered : null;

  return {
    organicSessions: { value: curOrganic, changePct: pctChange(curOrganic, prevOrganic) },
    totalSessions: { value: curSessions, changePct: pctChange(curSessions, prevSessions) },
    activeUsers: { value: curActiveUsers, changePct: pctChange(curActiveUsers, prevActiveUsers) },
    engagementRate: { value: curEngagementRate, changePct: pctChange(curEngagementRate, prevEngagementRate) },
    suburbsCovered: { value: suburbsCoveredNow, change: suburbsCoveredChange },
    searchClicks: { value: curClicks, changePct: pctChange(curClicks, prevClicks) },
    searchImpressions: { value: curImpressions, changePct: pctChange(curImpressions, prevImpressions) },
    avgPosition: { value: curPosition, change: prevPosition !== 0 ? curPosition - prevPosition : null },
    avgCtr: { value: curCtr, changePct: pctChange(curCtr, prevCtr) },
    topPages,
    topSources,
    topQueries,
  };
}
