import { NextRequest, NextResponse } from "next/server";
import { sendNeonUsageAlertEmail, type NeonUsageRow } from "@/lib/mail";

export const maxDuration = 30;

const WARN_PCT = 70;
const URGENT_PCT = 90;

// GET /api/cron/neon-usage — reads this month's Neon consumption through
// Neon's API and emails the admin when a plan limit is getting close.
// Requires the shared CRON_SECRET like the other cron routes.
// ?test=1 sends the email regardless of usage, to confirm delivery.
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

  const p = body?.project ?? {};
  const start = new Date(p.consumption_period_start).getTime();
  const end = new Date(p.consumption_period_end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return NextResponse.json({ error: "Neon response had no billing period" }, { status: 502 });
  }
  const elapsedDays = Math.max((Date.now() - start) / 86_400_000, 0.5);
  const totalDays = (end - start) / 86_400_000;

  // Plan limits are not in the API response, so they are settings. The
  // defaults match Neon's Free plan: 100 compute hours, 5 GB transfer, 0.5 GB storage.
  const computeLimitHours = Number(process.env.NEON_COMPUTE_LIMIT_HOURS ?? 100);
  const transferLimitGb = Number(process.env.NEON_TRANSFER_LIMIT_GB ?? 5);
  const storageLimitBytes = Number(p.branch_logical_size_limit_bytes ?? 536_870_912);

  const metric = (label: string, used: number, limit: number, fmt: (n: number) => string) => {
    const pct = (used / limit) * 100;
    const dailyPct = pct / elapsedDays;
    return {
      label,
      used: fmt(used),
      limit: fmt(limit),
      pct,
      projectedPct: dailyPct * totalDays,
      crossedWarnToday: pct >= WARN_PCT && pct - dailyPct < WARN_PCT,
    };
  };
  const metrics = [
    metric("Compute", (p.compute_time_seconds ?? 0) / 3600, computeLimitHours, (n) => `${n.toFixed(1)} hours`),
    metric("Data transfer", (p.data_transfer_bytes ?? 0) / 1e9, transferLimitGb, (n) => `${n.toFixed(2)} GB`),
    metric("Storage", p.synthetic_storage_size ?? 0, storageLimitBytes, (n) => `${(n / 1e6).toFixed(0)} MB`),
  ];

  const urgent = metrics.some((m) => m.pct >= URGENT_PCT);
  const isTest = req.nextUrl.searchParams.get("test") === "1";
  const shouldEmail = isTest || urgent || metrics.some((m) => m.crossedWarnToday);

  let emailed = false;
  if (shouldEmail) {
    const rows: NeonUsageRow[] = metrics.map(({ label, used, limit, pct, projectedPct }) => ({
      label,
      used,
      limit,
      pct,
      projectedPct,
    }));
    emailed = await sendNeonUsageAlertEmail({
      urgent,
      rows,
      periodEnd: new Date(end).toLocaleDateString("en-AU", { day: "numeric", month: "long" }),
      isTest,
    });
  }

  return NextResponse.json({
    periodStart: p.consumption_period_start,
    periodEnd: p.consumption_period_end,
    metrics: metrics.map(({ label, used, limit, pct, projectedPct }) => ({
      label,
      used,
      limit,
      pct: Math.round(pct),
      projectedPct: Math.round(projectedPct),
    })),
    urgent,
    emailed,
  });
}
