import { NextRequest, NextResponse } from "next/server";
import { bustCategoriesCache, bustSpecialsCache } from "@/lib/bustCache";

// GET /api/revalidate — clears the shared page-data cache. Needed after
// changing the database directly (import scripts), since those writes don't
// go through the app's own routes. Requires the shared CRON_SECRET.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  bustSpecialsCache();
  bustCategoriesCache();
  return NextResponse.json({ revalidated: ["specials", "categories"] });
}
