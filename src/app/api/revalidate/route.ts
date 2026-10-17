import { NextRequest, NextResponse } from "next/server";
import { bustBlogCache, bustCategoriesCache, bustSpecialsCache } from "@/lib/bustCache";
import { warmCache } from "@/lib/warmCache";

export const maxDuration = 60;

// GET /api/revalidate — clears the shared page-data cache. Needed after
// changing the database directly (import scripts), since those writes don't
// go through the app's own routes. Requires the shared CRON_SECRET.
// Add ?warm=1 to refill the cache straight afterwards, so a crawler is not the
// first visitor to each page.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  bustSpecialsCache();
  bustCategoriesCache();
  bustBlogCache();
  const warmed = req.nextUrl.searchParams.get("warm") === "1" ? await warmCache() : undefined;
  return NextResponse.json({ revalidated: ["specials", "categories", "blog"], warmed });
}
