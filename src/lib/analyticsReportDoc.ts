import { google, docs_v1 } from "googleapis";
import { getUserOAuthClient } from "@/lib/googleUserAuth";
import type { AnalyticsReport } from "@/lib/analyticsReport";

// Matches tailwind.config.ts's orange-600 — the site's actual brand red,
// used here so the report reads as a LunchSpecial document, not a generic
// export.
const BRAND_COLOR = { red: 0.803921568627451, green: 0.10980392156862745, blue: 0.09411764705882353 };
const HEADER_ROW_FILL = { red: 0.98, green: 0.93, blue: 0.93 }; // light tint of BRAND_COLOR

type TableSection = { heading: string; headers: string[]; rows: string[][] };

function buildSections(report: AnalyticsReport): TableSection[] {
  return [
    {
      heading: "Top Pages",
      headers: ["Page", "Sessions"],
      rows:
        report.topPages.length > 0
          ? report.topPages.map((p) => [p.path, String(p.sessions)])
          : [["No data", ""]],
    },
    {
      heading: "Top Traffic Sources",
      headers: ["Source", "Sessions"],
      rows:
        report.topSources.length > 0
          ? report.topSources.map((s) => [s.source, String(s.sessions)])
          : [["No data", ""]],
    },
    {
      heading: "Top Search Queries",
      headers: ["Query", "Clicks", "Impressions", "Avg. Position"],
      rows:
        report.topQueries.length > 0
          ? report.topQueries.map((q) => [
              q.query,
              String(q.clicks),
              String(q.impressions),
              q.position.toFixed(1),
            ])
          : [["No data", "", "", ""]],
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

  // ---- KPI stat table (2 rows x 4 columns), right after the subtitle ----
  const insertionPoint = endOfBody(await getDoc(docs, docId));
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: [{ insertTable: { rows: 2, columns: 4, location: { index: insertionPoint } } }] },
  });

  let doc = await getDoc(docs, docId);
  const kpiTableIndex = allTables(doc)[0].startIndex!;
  const kpiTableEndIndex = allTables(doc)[0].endIndex!;

  // ---- Section headings (plain text, one insertText) ----
  let cursor = kpiTableEndIndex;
  let sectionText = "\n"; // spacer after the KPI table
  const headingRanges: { start: number; end: number }[] = [];

  for (const section of sections) {
    const headingStart = cursor + sectionText.length;
    sectionText += `${section.heading}\n`;
    headingRanges.push({ start: headingStart, end: cursor + sectionText.length - 1 });
    sectionText += "\n";
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
  // text (safer than computing "end of heading paragraph" by hand, which
  // is exactly the kind of arithmetic that's been wrong twice already in
  // this file). Inserted in descending index order in one batch so an
  // earlier (higher-index) insertion never shifts a later (lower-index)
  // one's target out from under it — the insertion *point* argument, not
  // necessarily the resulting startIndex (see note above), so this is
  // still just about not corrupting each other's target locations.
  doc = await getDoc(docs, docId);
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
  // in document order, table 0 is the KPI table, tables 1..N are the
  // sections in the same order as `sections` (document order matches
  // array order since each was inserted after the previous section's
  // heading).
  doc = await getDoc(docs, docId);
  const tables = allTables(doc);
  const sectionTables = tables.slice(1);
  if (sectionTables.length !== sections.length) {
    throw new Error(`Expected ${sections.length} section tables, found ${sectionTables.length}`);
  }

  // ---- Fill every table's cells with real content ----
  const kpiCells = tableCellIndices(tables[0]);
  const kpiValues: [string, string][] = [
    ["Sessions", String(report.sessions)],
    ["Active Users", String(report.activeUsers)],
    ["Search Clicks", String(report.searchClicks)],
    ["Impressions", String(report.searchImpressions)],
  ];
  const fills: { index: number; text: string }[] = [
    ...kpiValues.map((v, i) => ({ index: kpiCells[i], text: v[0] })),
    ...kpiValues.map((v, i) => ({ index: kpiCells[4 + i], text: v[1] })),
  ];

  sections.forEach((section, i) => {
    const cells = tableCellIndices(sectionTables[i]);
    const flatRows = [section.headers, ...section.rows];
    let cellCursor = 0;
    for (const row of flatRows) {
      for (const value of row) {
        fills.push({ index: cells[cellCursor], text: value });
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
  // shaded header rows, larger bold KPI values ----
  doc = await getDoc(docs, docId);
  const finalTables = allTables(doc);
  const styleRequests: docs_v1.Schema$Request[] = [];

  function styleCellText(startIndex: number, endIndex: number, opts: { bold?: boolean; size?: number }) {
    if (endIndex <= startIndex) return;
    styleRequests.push({
      updateTextStyle: {
        range: { startIndex, endIndex },
        textStyle: { bold: opts.bold ?? false, fontSize: opts.size ? { magnitude: opts.size, unit: "PT" } : undefined },
        fields: [opts.bold !== undefined ? "bold" : "", opts.size ? "fontSize" : ""].filter(Boolean).join(","),
      },
    });
  }

  // KPI table: bold everything, larger font on the value row.
  const kpiTable = finalTables[0].table!;
  kpiTable.tableRows![0].tableCells!.forEach((cell) => {
    const p = cell.content![0];
    styleCellText(p.startIndex!, p.endIndex! - 1, { bold: true, size: 10 });
  });
  kpiTable.tableRows![1].tableCells!.forEach((cell) => {
    const p = cell.content![0];
    styleCellText(p.startIndex!, p.endIndex! - 1, { bold: true, size: 16 });
  });

  // Section tables: bold + shaded header row.
  for (const tableEl of finalTables.slice(1)) {
    const headerRow = tableEl.table!.tableRows![0];
    styleRequests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableEl.startIndex! },
            rowIndex: 0,
            columnIndex: 0,
          },
          rowSpan: 1,
          columnSpan: headerRow.tableCells!.length,
        },
        tableCellStyle: { backgroundColor: { color: { rgbColor: HEADER_ROW_FILL } } },
        fields: "backgroundColor",
      },
    });
    for (const cell of headerRow.tableCells!) {
      const p = cell.content![0];
      styleCellText(p.startIndex!, p.endIndex! - 1, { bold: true });
    }
  }

  if (styleRequests.length > 0) {
    await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: styleRequests } });
  }

  return { docId, url: file.data.webViewLink! };
}
