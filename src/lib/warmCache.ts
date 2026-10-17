import { SITE_URL } from "@/lib/site";

const CONCURRENCY = 8;
// Stay inside the function's 60s limit; anything not reached is warmed by the
// next crawler visit or the next run.
const TIME_BUDGET_MS = 50_000;

async function pageUrlsFromSitemap(): Promise<string[]> {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, { cache: "no-store" });
  const xml = await res.text();
  // Plain <loc> only; the image sitemap entries use <image:loc>.
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

// Visits every public page once, the way a crawler would, so the shared page
// data cache (see cachedQueries.ts) is filled in one short burst. That way the
// database wakes for a few minutes in one go instead of being poked all day by
// whichever page a bot happens to ask for next.
export async function warmCache() {
  const started = Date.now();
  const urls = await pageUrlsFromSitemap();
  let next = 0;
  let ok = 0;
  let failed = 0;

  async function worker() {
    while (next < urls.length && Date.now() - started < TIME_BUDGET_MS) {
      const url = urls[next++];
      try {
        const res = await fetch(url, { headers: { "user-agent": "LunchSpecialCacheWarmer" }, cache: "no-store" });
        await res.arrayBuffer();
        if (res.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return { total: urls.length, visited: next, ok, failed, seconds: Math.round((Date.now() - started) / 100) / 10 };
}
