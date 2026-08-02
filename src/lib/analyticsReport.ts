import { google } from "googleapis";

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

export type AnalyticsReport = {
  sessions: number;
  activeUsers: number;
  topPages: { path: string; sessions: number }[];
  topSources: { source: string; sessions: number }[];
  searchClicks: number;
  searchImpressions: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
};

// Search Console's data lags a few days behind real-time (Google's own
// documented delay), so "the last 7 days" as of today would mostly return
// zeros for the most recent days — end the range a few days back instead of
// at today for numbers that are actually complete.
const SEARCH_CONSOLE_LAG_DAYS = 3;

export async function getWeeklyAnalyticsReport(): Promise<AnalyticsReport> {
  const auth = getAuth();

  const analyticsdata = google.analyticsdata({ version: "v1beta", auth });
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;

  const [totals, pages, sources] = await Promise.all([
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
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

  const totalsRow = totals.data.rows?.[0];
  const sessions = Number(totalsRow?.metricValues?.[0]?.value ?? 0);
  const activeUsers = Number(totalsRow?.metricValues?.[1]?.value ?? 0);

  const topPages = (pages.data.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const topSources = (sources.data.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const searchconsole = google.searchconsole({ version: "v1", auth });
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL!;
  const end = new Date();
  end.setDate(end.getDate() - SEARCH_CONSOLE_LAG_DAYS);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [totalsQuery, queriesQuery] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(start), endDate: fmt(end) },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ["query"],
        rowLimit: 5,
      },
    }),
  ]);

  const searchTotalsRow = totalsQuery.data.rows?.[0];
  const searchClicks = searchTotalsRow?.clicks ?? 0;
  const searchImpressions = searchTotalsRow?.impressions ?? 0;

  const topQueries = (queriesQuery.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position: r.position ?? 0,
  }));

  return { sessions, activeUsers, topPages, topSources, searchClicks, searchImpressions, topQueries };
}
