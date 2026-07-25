import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { idFromSlug } from "@/lib/slugify";

// Prisma needs the Node runtime, not edge (the default for this file convention).
export const runtime = "nodejs";
export const alt = "LunchSpecial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const special = await prisma.special.findUnique({
    where: { id: idFromSlug(params.id) },
    select: {
      title: true,
      venueName: true,
      imageUrl: true,
      specialPrice: true,
      discountPercent: true,
      chainWide: true,
      suburbs: { include: { suburb: true } },
    },
  });

  const priceText =
    special?.specialPrice != null
      ? `$${special.specialPrice.toFixed(2)}`
      : special?.discountPercent != null
      ? `${special.discountPercent}% off`
      : null;

  const location = special?.chainWide ? "All locations" : special?.suburbs[0]?.suburb.name ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#111827",
        }}
      >
        {special?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={special.imageUrl}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
          />
        )}

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background: special?.imageUrl
              ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.35) 100%)"
              : "linear-gradient(135deg, #cd1c18 0%, #7f110f 100%)", // brand red, see src/app/opengraph-image.tsx
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 48,
            left: 60,
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            color: "#ffffff",
            opacity: 0.9,
          }}
        >
          LunchSpecial
        </div>

        {priceText && (
          <div
            style={{
              position: "absolute",
              top: 44,
              right: 60,
              display: "flex",
              background: "#16a34a",
              color: "#ffffff",
              fontSize: 48,
              fontWeight: 700,
              padding: "14px 32px",
              borderRadius: 20,
            }}
          >
            {priceText}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 60,
            right: 60,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {special?.title ?? "Lunch specials near you"}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#f3f4f6", marginTop: 16 }}>
            {special ? `${special.venueName}${location ? ` — ${location}` : ""}` : "Crowdsourced by LunchSpecial"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
