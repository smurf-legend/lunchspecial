import { prisma } from "@/lib/prisma";

// States considered "live" right now — has at least one suburb with a real
// local special (chain-wide deals don't count, since those show up
// everywhere regardless of actual local coverage). Deliberately not a
// hardcoded list: LunchSpecial is Sydney/NSW-only for now (one person
// building this, starting where they live), but the suburb/state
// infrastructure is already seeded nationwide — the moment real specials
// get posted in a new state, it lights up on its own, no code change
// needed.
export async function getLiveStates(): Promise<Set<string>> {
  const rows = await prisma.suburb.findMany({
    where: { specials: { some: { special: { hidden: false } } } },
    select: { state: true },
    distinct: ["state"],
  });
  return new Set(rows.map((r) => r.state));
}
