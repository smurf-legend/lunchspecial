import { NextRequest, NextResponse } from "next/server";
import { warmCache } from "@/lib/warmCache";

export const maxDuration = 60;

// GET /api/cron/warm-cache — triggered daily by Vercel Cron (see vercel.json).
// Requires the shared CRON_SECRET like the other cron routes.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await warmCache());
}
