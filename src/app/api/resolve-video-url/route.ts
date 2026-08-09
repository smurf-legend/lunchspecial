import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { socialEmbedUrl } from "@/lib/articleBlocks";
import { resolveVideoUrls } from "@/lib/resolveVideoUrls";

// Lets VideoLinksInput check a pasted link the same way the save endpoints
// do — resolving TikTok/Facebook share links to their canonical form before
// checking it's embeddable — so a share link doesn't show as "invalid" in
// the form just because the browser can't follow the redirect itself the
// way a full page load would. Requires login (same bar as /api/upload)
// since it's a server-side fetch of a caller-supplied URL.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Not a valid URL" }, { status: 400 });
  }

  const [resolvedUrl] = await resolveVideoUrls([url]);
  if (!socialEmbedUrl(resolvedUrl)) {
    return NextResponse.json(
      { error: "Not a recognized YouTube, TikTok, Instagram, X, Facebook, or Vimeo link" },
      { status: 400 }
    );
  }

  return NextResponse.json({ resolvedUrl });
}
