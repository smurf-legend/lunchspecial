import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/suburbs/nearest {lat, lng} — used by the "specials near me"
// auto-geolocation on the homepage. Every listing right now is NSW-only
// (see /api/suburbs/search), so this only ever matches within NSW —
// someone geolocating from outside NSW just gets no match, same as if
// they'd typed an out-of-state suburb into the search box.
//
// Only matches a suburb that actually has a live special (same hidden/
// needsReview definition used for suburb coverage elsewhere, e.g.
// analyticsReport.ts's suburbsCovered). Nearest-geographically isn't good
// enough here — coverage is still sparse enough that "your closest suburb"
// and "your closest suburb with an actual deal in it" are often different
// places, and landing someone auto-detected onto a page with zero results
// is a worse first impression than just not auto-filtering at all.
//
// Haversine distance computed in SQL rather than pulling matching NSW
// suburb rows into Node — this is a single indexed-scan query either way,
// and doing the math in Postgres means only the single nearest row (plus
// its distance, handy for capping "near me" at a sane radius later) ever
// crosses the wire.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<{ name: string; slug: string; distanceKm: number }[]>`
    SELECT s.name, s.slug,
      ( 6371 * acos(
          least(1, greatest(-1,
            cos(radians(${lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(s.latitude))
          ))
        ) ) AS "distanceKm"
    FROM "Suburb" s
    WHERE s.state = 'NSW' AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "SpecialSuburb" ss
        JOIN "Special" sp ON sp.id = ss."specialId"
        WHERE ss."suburbId" = s.id AND sp.hidden = false AND sp."needsReview" = false
      )
    ORDER BY "distanceKm" ASC
    LIMIT 1
  `;

  const nearest = rows[0];
  if (!nearest) return NextResponse.json({ suburb: null });

  return NextResponse.json({
    suburb: { name: nearest.name, slug: nearest.slug, distanceKm: Math.round(nearest.distanceKm * 10) / 10 },
  });
}
