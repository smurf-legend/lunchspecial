import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple DB-backed fixed-window rate limiter — no Redis/external service
// needed at this scale. Each call records a hit and counts hits for `key`
// within the trailing `windowMs`; stale rows for that key are opportunistically
// deleted on the same call rather than needing a separate cleanup job, so the
// table never grows much past (distinct keys) * (limit).
export async function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - windowMs);

  const [count] = await Promise.all([
    prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } }),
    prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } }),
  ]);

  if (count >= limit) {
    return { allowed: false };
  }

  await prisma.rateLimitHit.create({ data: { key } });
  return { allowed: true };
}

// Vercel populates the real client IP on NextRequest.ip; x-forwarded-for is
// the fallback for local dev / non-Vercel environments and for NextAuth's
// authorize() callback, whose req.headers is a plain object rather than a
// Headers instance. Never trust this for anything beyond throttling — it's
// caller-influenceable.
export function getClientIp(req: NextRequest | { headers?: Record<string, any> | null }): string {
  const rawHeaders = (req as NextRequest).headers;
  const forwarded =
    typeof (rawHeaders as Headers)?.get === "function"
      ? (rawHeaders as Headers).get("x-forwarded-for")
      : (req.headers as Record<string, any> | undefined)?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return (req as NextRequest).ip ?? "unknown";
}
