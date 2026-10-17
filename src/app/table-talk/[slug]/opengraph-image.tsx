import { ImageResponse } from "next/og";
import { getBlogPostForShareImageCached } from "@/lib/cachedQueries";

// Prisma needs the Node runtime, not edge (the default for this file convention).
export const runtime = "nodejs";
export const alt = "LunchSpecial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getBlogPostForShareImageCached(params.slug);
  const hasImage = !!post?.imageUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 64,
          gap: 48,
          // Brand red (tailwind.config.ts overrides Tailwind's orange-* scale
          // to this same red site-wide — @vercel/og renders raw inline
          // styles, not Tailwind classes, so it can't pick that up itself).
          // Kept as the constant background here — unlike Specials' cover
          // photos, a Table Talk image can be a logo, a text-crop screenshot,
          // or a photo, so a full-bleed dark-overlay treatment isn't reliably
          // legible against all of those; the red never has that problem.
          background: "linear-gradient(135deg, #cd1c18 0%, #7f110f 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: hasImage ? "0 0 640px" : "1 1 auto",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#ffffff", opacity: 0.85 }}>
            LunchSpecial — Table Talk
          </div>
          <div
            style={{
              display: "flex",
              fontSize: hasImage ? 48 : 58,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              marginTop: 20,
            }}
          >
            {post?.title ?? "Table Talk"}
          </div>
          {post?.excerpt && (
            <div style={{ display: "flex", fontSize: 26, color: "#fbefee", marginTop: 20, lineHeight: 1.4 }}>
              {post.excerpt.length > 130 ? `${post.excerpt.slice(0, 130)}…` : post.excerpt}
            </div>
          )}
        </div>

        {hasImage && (
          <div
            style={{
              display: "flex",
              flex: "0 0 420px",
              height: 420,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#ffffff",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post!.imageUrl!} width={420} height={420} style={{ objectFit: "contain" }} />
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
