import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/upload — body is the raw image file, ?filename=xyz.jpg query param
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

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

  const userId = (session.user as any).id as string;
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  // Random suffix (not just Date.now()) since multi-image posts upload
  // several files concurrently and could otherwise land in the same ms.
  const unique = Math.random().toString(36).slice(2, 8);
  const pathname = `specials/${userId}-${Date.now()}-${unique}.${ext}`;

  const blob = await put(pathname, req.body, {
    access: "public",
    contentType,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
