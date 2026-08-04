import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/suburbs/nearest {lat, lng} — used by the "specials near me"
// auto-geolocation on the homepage. Every listing right now is NSW-only
// (see /api/suburbs/search), so this only ever matches within NSW —
// someone geolocating from outside NSW just gets no match, same as if
// they'd typed an out-of-state suburb into the search box.
//
// Haversine distance computed in SQL rather than pulling all ~5k NSW
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
    SELECT name, slug,
      ( 6371 * acos(
          least(1, greatest(-1,
            cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(latitude))
          ))
        ) ) AS "distanceKm"
    FROM "Suburb"
    WHERE state = 'NSW' AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY "distanceKm" ASC
    LIMIT 1
  `;

  const nearest = rows[0];
  if (!nearest) return NextResponse.json({ suburb: null });

  return NextResponse.json({
    suburb: { name: nearest.name, slug: nearest.slug, distanceKm: Math.round(nearest.distanceKm * 10) / 10 },
  });
}
