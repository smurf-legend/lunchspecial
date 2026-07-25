import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "LunchSpecial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const suburb = await prisma.suburb.findUnique({ where: { slug: params.slug } });

  const dealCount = suburb
    ? await prisma.special.count({
        where: {
          hidden: false,
          OR: [{ suburbs: { some: { suburbId: suburb.id } } }, { chainWide: true }],
        },
      })
    : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          background: "linear-gradient(135deg, #cd1c18 0%, #7f110f 100%)", // brand red, see src/app/opengraph-image.tsx
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", opacity: 0.85 }}>
          LunchSpecial
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#ffffff", marginTop: 24 }}>
          Lunch specials in {suburb?.name ?? "your suburb"}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#f3f4f6", marginTop: 20 }}>
          {dealCount} deal{dealCount === 1 ? "" : "s"} crowdsourced by the community
        </div>
      </div>
    ),
    { ...size }
  );
}
