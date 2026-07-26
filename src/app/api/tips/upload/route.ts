import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/tips/upload — same idea as /api/upload but deliberately open to
// anonymous callers, since the whole point of the tip form is not requiring
// an account. Kept as its own route (not a auth-optional branch on the real
// upload endpoint) so the anonymous path stays easy to reason about/lock
// down separately if it's ever abused.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const ext = contentType.split("/")[1] || "jpg";
  const unique = Math.random().toString(36).slice(2, 10);
  const pathname = `tips/${Date.now()}-${unique}.${ext}`;

  const blob = await put(pathname, req.body, {
    access: "public",
    contentType,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
