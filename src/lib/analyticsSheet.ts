import { google } from "googleapis";
import { getUserOAuthClient } from "@/lib/googleUserAuth";
import type { AnalyticsReport } from "@/lib/analyticsReport";

const SHEET_NAME = "LunchSpecial Weekly Metrics";

// Raw values only, one row per week — no pre-computed deltas. The whole
// point of a running sheet over a one-off doc is that comparing any two
// weeks (not just consecutive ones) is just picking two rows, so baking in
// a "vs last week" column would be redundant with what the sheet itself
// already makes easy.
const HEADERS = [
  "Week ending",
  "Organic sessions",
  "Total sessions",
  "Active users",
  "Engagement rate %",
  "Suburbs with a live special",
  "Search Console clicks",
  "Search Console impressions",
  "Search Console avg. position",
  "Search Console CTR %",
];

function reportRow(report: AnalyticsReport, weekEndingLabel: string): (string | number)[] {
  return [
    weekEndingLabel,
    report.organicSessions.value,
    report.totalSessions.value,
    report.activeUsers.value,
    Number(report.engagementRate.value.toFixed(1)),
    report.suburbsCovered.value,
    report.searchClicks.value,
    report.searchImpressions.value,
    Number(report.avgPosition.value.toFixed(1)),
    Number(report.avgCtr.value.toFixed(1)),
  ];
}

// Sheets' values.append API just adds a row after the last one with data —
// no index prediction needed (unlike the Docs API elsewhere in this file's
// neighborhood, which needed a re-fetch-to-verify approach specifically
// because it *doesn't* have an "append" primitive). Finds the existing
// sheet by name so re-running this doesn't create a new spreadsheet every
// week; creates it (with a header row) the first time.
export async function appendWeeklyMetricsRow(
  report: AnalyticsReport,
  weekEndingLabel: string
): Promise<{ spreadsheetId: string; url: string } | null> {
  const auth = await getUserOAuthClient();
  if (!auth) return null; // no account connected yet — see /kitchen "Connect Google account"

  const folderId = process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_REPORTS_FOLDER_ID is not set");

  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id,webViewLink)",
  });

  let spreadsheetId: string;
  let url: string;

  if (existing.data.files && existing.data.files.length > 0) {
    spreadsheetId = existing.data.files[0].id!;
    url = existing.data.files[0].webViewLink!;
  } else {
    // Sheets API's own .create(), like Docs', creates in the caller's own
    // Drive space first — move it into the real folder right after, same
    // reasoning as createAnalyticsReportDoc.
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title: SHEET_NAME } },
      fields: "spreadsheetId",
    });
    spreadsheetId = created.data.spreadsheetId!;
    const file = await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: "webViewLink",
    });
    url = file.data.webViewLink!;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: { values: [reportRow(report, weekEndingLabel)] },
  });

  return { spreadsheetId, url };
}
