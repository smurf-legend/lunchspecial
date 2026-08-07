// Labels only — shared between page.tsx (which pairs each key with a real
// Prisma `where`/`rangeField` for querying) and LocationSearch (a client
// component that only needs the label text to render the pill links, not
// the query logic behind them).
export const PRICE_TIER_LABELS: Record<string, string> = {
  under10: "Under $10",
  under15: "Under $15",
  under20: "Under $20",
  under25: "Under $25",
  over25: "Over $25",
};
