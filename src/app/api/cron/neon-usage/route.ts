import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// GET /api/cron/neon-usage — reads this month's Neon consumption through
// Neon's API. Requires the shared CRON_SECRET like the other cron routes.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json({ error: "NEON_API_KEY and NEON_PROJECT_ID must both be set" }, { status: 500 });
  }

  const res = await fetch(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Neon API request failed", status: res.status, message: body?.message ?? null },
      { status: 502 }
    );
  }

  // Only usage-shaped fields are returned, never the full project object.
  const project = body?.project ?? {};
  const usage: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(project)) {
    if (typeof value === "number" || /_(start|end)$/.test(key)) usage[key] = value;
  }
  return NextResponse.json({
    name: project.name ?? null,
    region: project.region_id ?? null,
    usage,
    quota: project.settings?.quota ?? null,
  });
}
