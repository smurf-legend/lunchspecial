import { google, docs_v1 } from "googleapis";
import { getUserOAuthClient } from "@/lib/googleUserAuth";
import type { AnalyticsReport, Trend, DeltaTrend } from "@/lib/analyticsReport";

// Matches tailwind.config.ts's orange-600 — the site's actual brand red,
// used here so the report reads as a LunchSpecial document, not a generic
// export.
const BRAND_COLOR = { red: 0.803921568627451, green: 0.10980392156862745, blue: 0.09411764705882353 };
const HEADER_ROW_FILL = { red: 0.98, green: 0.93, blue: 0.93 }; // light tint of BRAND_COLOR
const GOOD_COLOR = { red: 0.086, green: 0.639, blue: 0.29 }; // green
const BAD_COLOR = { red: 0.863, green: 0.149, blue: 0.149 }; // red

type Cell = { text: string; color?: { red: number; green: number; blue: number } };
type TableSection = { heading: string; headers: string[]; rows: Cell[][]; boldColumn?: number };

function trendCell(t: Trend, opts: { goodIsDown?: boolean; suffix?: string } = {}): Cell {
  if (t.changePct === null) return { text: "—" };
  const up = t.changePct >= 0;
  const good = opts.goodIsDown ? !up : up;
  const arrow = up ? "▲" : "▼";
  return { text: `${arrow} ${Math.abs(t.changePct).toFixed(1)}%`, color: good ? GOOD_COLOR : BAD_COLOR };
}

function deltaCell(d: DeltaTrend, opts: { goodIsDown?: boolean; decimals?: number } = {}): Cell {
  if (d.change === null) return { text: "—" };
  const up = d.change >= 0;
  const good = opts.goodIsDown ? !up : up;
  const arrow = up ? "▲" : "▼";
  const decimals = opts.decimals ?? 0;
  return { text: `${arrow} ${Math.abs(d.change).toFixed(decimals)}`, color: good ? GOOD_COLOR : BAD_COLOR };
}

function buildSections(report: AnalyticsReport): TableSection[] {
  return [
    {
      // The metrics actually worth watching to make improvements (decided
      // after going through this explicitly) — organic traffic and suburb
      // coverage first, since those most directly answer "is SEO working"
      // and "did we grow the thing we control," Search Console detail
      // explaining *why* next, general site health last.
      heading: "This Week — What Actually Matters",
      headers: ["Metric", "Value", "vs. Last Week"],
      boldColumn: 1,
      rows: [
        [{ text: "Organic search sessions" }, { text: String(report.organicSessions.value) }, trendCell(report.organicSessions)],
        [
          { text: "Suburbs with a live special" },
          { text: String(report.suburbsCovered.value) },
          deltaCell(report.suburbsCovered),
        ],
        [
          { text: "Search Console avg. position" },
          { text: report.avgPosition.value.toFixed(1) },
          deltaCell(report.avgPosition, { goodIsDown: true, decimals: 1 }),
        ],
        [{ text: "Search Console clicks" }, { text: String(report.searchClicks.value) }, trendCell(report.searchClicks)],
        [
          { text: "Search Console impressions" },
          { text: String(report.searchImpressions.value) },
          trendCell(report.searchImpressions),
        ],
        [{ text: "Search Console CTR" }, { text: `${report.avgCtr.value.toFixed(1)}%` }, trendCell(report.avgCtr)],
        [{ text: "Total sessions" }, { text: String(report.totalSessions.value) }, trendCell(report.totalSessions)],
        [{ text: "Active users" }, { text: String(report.activeUsers.value) }, trendCell(report.activeUsers)],
        [
          { text: "Engagement rate" },
          { text: `${report.engagementRate.value.toFixed(1)}%` },
          trendCell(report.engagementRate),
        ],
      ],
    },
    {
      heading: "Top Pages",
      headers: ["Page", "Sessions"],
      rows:
        report.topPages.length > 0
          ? report.topPages.map((p) => [{ text: p.path }, { text: String(p.sessions) }])
          : [[{ text: "No data" }, { text: "" }]],
    },
    {
      heading: "Top Traffic Sources",
      headers: ["Source", "Sessions"],
      rows:
        report.topSources.length > 0
          ? report.topSources.map((s) => [{ text: s.source }, { text: String(s.sessions) }])
          : [[{ text: "No data" }, { text: "" }]],
    },
    {
      heading: "Top Search Queries",
      headers: ["Query", "Clicks", "Impressions", "Avg. Position"],
      rows:
        report.topQueries.length > 0
          ? report.topQueries.map((q) => [
              { text: q.query },
              { text: String(q.clicks) },
              { text: String(q.impressions) },
              { text: q.position.toFixed(1) },
            ])
          : [[{ text: "No data" }, { text: "" }, { text: "" }, { text: "" }]],
    },
  ];
}

async function getDoc(docs: docs_v1.Docs, documentId: string) {
  const res = await docs.documents.get({ documentId });
  return res.data;
}

// A brand-new Doc isn't actually empty (it has one pre-existing empty
// paragraph), and — confirmed while building this — even insertTable can
// land one index off from where it's told to. Both of those are exactly
// the kind of thing that's fragile to predict by formula and cheap to just
// ask the API directly instead: every table's real position/cell indices
// below come from re-fetching the document, never from the index used to
// insert it.
function endOfBody(doc: docs_v1.Schema$Document): number {
  const content = doc.body!.content!;
  return content[content.length - 1].endIndex! - 1;
}

function allTables(doc: docs_v1.Schema$Document) {
  return doc.body!.content!.filter((el) => el.table);
}

// Cells in reading order (row by row, left to right) with the character
// index of their (currently empty) paragraph, so text can be inserted at
// exactly the right place.
function tableCellIndices(tableElement: docs_v1.Schema$StructuralElement) {
  const cells: number[] = [];
  for (const row of tableElement.table!.tableRows ?? []) {
    for (const cell of row.tableCells ?? []) {
      cells.push(cell.content![0].startIndex!);
    }
  }
  return cells;
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
  const docs = google.docs({ version: "v1", auth });

  const sections = buildSections(report);
  const shift = (n: number) => n + 1; // index 1 is the body's true start

  // ---- Title + subtitle ----
  let text = "LunchSpecial — Weekly Analytics Report\n";
  const titleRange = { start: 0, end: text.length - 1 };
  text += `${dateRangeLabel}\n`;
  const subtitleRange = { start: titleRange.end + 1, end: text.length - 1 };
  text += "\n";

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        { insertText: { location: { index: 1 }, text } },
        {
          updateParagraphStyle: {
            range: { startIndex: shift(titleRange.start), endIndex: shift(titleRange.end) },
            paragraphStyle: { namedStyleType: "TITLE" },
            fields: "namedStyleType",
          },
        },
        {
          updateTextStyle: {
            range: { startIndex: shift(subtitleRange.start), endIndex: shift(subtitleRange.end) },
            textStyle: { foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } } },
            fields: "foregroundColor",
          },
        },
      ],
    },
  });

  // ---- Section headings (plain text, one insertText) ----
  let cursor = endOfBody(await getDoc(docs, docId));
  let sectionText = "";
  const headingRanges: { start: number; end: number }[] = [];

  for (const section of sections) {
    const headingStart = cursor + sectionText.length;
    sectionText += `${section.heading}\n`;
    headingRanges.push({ start: headingStart, end: cursor + sectionText.length - 1 });
    sectionText += "\n"; // spacer — a table gets inserted right after this heading
  }

  const headingRequests: docs_v1.Schema$Request[] = [
    { insertText: { location: { index: cursor }, text: sectionText } },
  ];
  for (const r of headingRanges) {
    headingRequests.push(
      {
        updateParagraphStyle: {
          range: { startIndex: r.start, endIndex: r.end },
          paragraphStyle: { namedStyleType: "HEADING_1" },
          fields: "namedStyleType",
        },
      },
      {
        updateTextStyle: {
          range: { startIndex: r.start, endIndex: r.end },
          textStyle: { foregroundColor: { color: { rgbColor: BRAND_COLOR } } },
          fields: "foregroundColor",
        },
      }
    );
  }
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: headingRequests } });

  // ---- One table per section, found by matching each heading's exact
  // text (safer than computing "end of heading paragraph" by hand — see
  // the endOfBody comment above, this file has already been bitten twice
  // by that kind of arithmetic). Inserted in descending index order in one
  // batch so an earlier (higher-index) insertion never shifts a later
  // (lower-index) one's target out from under it.
  let doc = await getDoc(docs, docId);
  const headingInsertionPoints = sections.map((section) => {
    const match = doc.body!.content!.find((el) =>
      el.paragraph?.elements?.some((e) => e.textRun?.content === `${section.heading}\n`)
    );
    if (!match) throw new Error(`Could not find heading paragraph for "${section.heading}"`);
    return match.endIndex!;
  });

  const descendingInserts = sections
    .map((section, i) => ({ section, index: headingInsertionPoints[i] }))
    .sort((a, b) => b.index - a.index);

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: descendingInserts.map(({ section, index }) => ({
        insertTable: { rows: section.rows.length + 1, columns: section.headers.length, location: { index } },
      })),
    },
  });

  // Re-discover the real tables rather than trust the insertion points —
  // in document order, they land in the same order as `sections` (each was
  // inserted right after its own heading).
  doc = await getDoc(docs, docId);
  const tables = allTables(doc);
  if (tables.length !== sections.length) {
    throw new Error(`Expected ${sections.length} tables, found ${tables.length}`);
  }

  // ---- Fill every table's cells with real content ----
  const fills: { index: number; text: string }[] = [];
  sections.forEach((section, i) => {
    const cells = tableCellIndices(tables[i]);
    const flatRows: Cell[][] = [section.headers.map((h) => ({ text: h })), ...section.rows];
    let cellCursor = 0;
    for (const row of flatRows) {
      for (const cell of row) {
        fills.push({ index: cells[cellCursor], text: cell.text });
        cellCursor++;
      }
    }
  });

  const fillRequests: docs_v1.Schema$Request[] = fills
    .filter((f) => f.text.length > 0)
    .sort((a, b) => b.index - a.index) // descending — same shift-avoidance trick as the tables above
    .map((f) => ({ insertText: { location: { index: f.index }, text: f.text } }));

  if (fillRequests.length > 0) {
    await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: fillRequests } });
  }

  // ---- Styling now that every cell has real, final content — bold +
  // shaded header rows, bold "value" columns, trend colors on the "vs
  // last week" cells.
  doc = await getDoc(docs, docId);
  const finalTables = allTables(doc);
  const styleRequests: docs_v1.Schema$Request[] = [];

  function styleCellText(startIndex: number, endIndex: number, opts: { bold?: boolean; color?: Cell["color"] }) {
    if (endIndex <= startIndex) return;
    const textStyle: docs_v1.Schema$TextStyle = {};
    const fields: string[] = [];
    if (opts.bold !== undefined) {
      textStyle.bold = opts.bold;
      fields.push("bold");
    }
    if (opts.color) {
      textStyle.foregroundColor = { color: { rgbColor: opts.color } };
      fields.push("foregroundColor");
    }
    styleRequests.push({ updateTextStyle: { range: { startIndex, endIndex }, textStyle, fields: fields.join(",") } });
  }

  sections.forEach((section, i) => {
    const tableEl = finalTables[i];
    const rows = tableEl.table!.tableRows!;

    // Header row: bold + shaded background.
    styleRequests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: { tableStartLocation: { index: tableEl.startIndex! }, rowIndex: 0, columnIndex: 0 },
          rowSpan: 1,
          columnSpan: section.headers.length,
        },
        tableCellStyle: { backgroundColor: { color: { rgbColor: HEADER_ROW_FILL } } },
        fields: "backgroundColor",
      },
    });
    for (const cell of rows[0].tableCells!) {
      const p = cell.content![0];
      styleCellText(p.startIndex!, p.endIndex! - 1, { bold: true });
    }

    // Data rows: bold the designated "value" column, color the trend
    // column's arrow text (recovered from `section.rows`, since that's
    // where the color decision was actually made, not derivable from the
    // plain string now sitting in the cell).
    for (let r = 0; r < section.rows.length; r++) {
      const dataRow = rows[r + 1].tableCells!;
      for (let c = 0; c < section.rows[r].length; c++) {
        const cellData = section.rows[r][c];
        const p = dataRow[c].content![0];
        const bold = section.boldColumn === c;
        if (bold || cellData.color) {
          styleCellText(p.startIndex!, p.endIndex! - 1, { bold: bold || undefined, color: cellData.color });
        }
      }
    }
  });

  if (styleRequests.length > 0) {
    await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: styleRequests } });
  }

  return { docId, url: file.data.webViewLink! };
}
