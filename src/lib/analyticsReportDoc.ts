import { google, docs_v1 } from "googleapis";
import { getUserOAuthClient } from "@/lib/googleUserAuth";
import type { AnalyticsReport } from "@/lib/analyticsReport";

// The Docs API takes a flat list of requests referencing character
// indices, not a document tree — easiest way to build one accurately is to
// assemble the full plain-text body first (tracking each section's start/
// end offset as we go), then emit styling requests against those known
// offsets in a single batchUpdate. Offsets are relative to index 1 (Docs
// bodies always start there, index 0 is the document's own boundary).
type Section = { heading: string; lines: string[] };

function buildContent(report: AnalyticsReport, dateRangeLabel: string) {
  const sections: Section[] = [
    {
      heading: "Overview",
      lines: [`${report.sessions} sessions`, `${report.activeUsers} active users`],
    },
    {
      heading: "Top Pages",
      lines:
        report.topPages.length > 0
          ? report.topPages.map((p) => `${p.path} — ${p.sessions} session${p.sessions === 1 ? "" : "s"}`)
          : ["No data"],
    },
    {
      heading: "Top Traffic Sources",
      lines:
        report.topSources.length > 0
          ? report.topSources.map((s) => `${s.source} — ${s.sessions} session${s.sessions === 1 ? "" : "s"}`)
          : ["No data"],
    },
    {
      heading: "Search Console",
      lines: [
        `${report.searchClicks} clicks, ${report.searchImpressions} impressions`,
        ...(report.topQueries.length > 0
          ? report.topQueries.map(
              (q) =>
                `"${q.query}" — ${q.clicks} click${q.clicks === 1 ? "" : "s"}, ${q.impressions} impression${
                  q.impressions === 1 ? "" : "s"
                }, avg position ${q.position.toFixed(1)}`
            )
          : ["No data"]),
      ],
    },
  ];

  let text = "LunchSpecial — Weekly Analytics Report\n";
  const titleRange = { start: 0, end: text.length - 1 };
  text += `${dateRangeLabel}\n\n`;

  const headingRanges: { start: number; end: number }[] = [];
  const bulletRanges: { start: number; end: number }[] = [];

  for (const section of sections) {
    const headingStart = text.length;
    text += `${section.heading}\n`;
    headingRanges.push({ start: headingStart, end: text.length - 1 });

    const bulletsStart = text.length;
    for (const line of section.lines) {
      text += `${line}\n`;
    }
    // -1 to exclude the final line's trailing newline from the bullet range
    // — Docs treats a bullet range's own trailing paragraph mark as part of
    // the *next* paragraph's bullet if included, which would bullet-ify the
    // blank spacer line after it.
    bulletRanges.push({ start: bulletsStart, end: text.length - 1 });

    text += "\n"; // blank spacer line between sections
  }

  return { text, titleRange, headingRanges, bulletRanges };
}

export async function createAnalyticsReportDoc(
  report: AnalyticsReport,
  dateRangeLabel: string
): Promise<{ docId: string; url: string } | null> {
  const auth = await getUserOAuthClient();
  if (!auth) return null; // no account connected yet — see /kitchen "Connect Google account"

  const folderId = process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_REPORTS_FOLDER_ID is not set");

  const drive = google.drive({ version: "v3", auth });
  const file = await drive.files.create({
    requestBody: {
      name: `LunchSpecial Analytics Report — ${dateRangeLabel}`,
      mimeType: "application/vnd.google-apps.document",
      parents: [folderId],
    },
    fields: "id,webViewLink",
  });
  const docId = file.data.id!;

  const { text, titleRange, headingRanges, bulletRanges } = buildContent(report, dateRangeLabel);

  // Indices are 1-based (index 1 is the very start of the body).
  const shift = (n: number) => n + 1;

  const requests: docs_v1.Schema$Request[] = [
    { insertText: { location: { index: 1 }, text } },
    {
      updateParagraphStyle: {
        range: { startIndex: shift(titleRange.start), endIndex: shift(titleRange.end) },
        paragraphStyle: { namedStyleType: "TITLE" },
        fields: "namedStyleType",
      },
    },
    ...headingRanges.map((r) => ({
      updateParagraphStyle: {
        range: { startIndex: shift(r.start), endIndex: shift(r.end) },
        paragraphStyle: { namedStyleType: "HEADING_1" as const },
        fields: "namedStyleType",
      },
    })),
    ...bulletRanges.map((r) => ({
      createParagraphBullets: {
        range: { startIndex: shift(r.start), endIndex: shift(r.end) },
        bulletPreset: "BULLET_DISC_CIRCLE_SQUARE" as const,
      },
    })),
  ];

  const docs = google.docs({ version: "v1", auth });
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } });

  return { docId, url: file.data.webViewLink! };
}
