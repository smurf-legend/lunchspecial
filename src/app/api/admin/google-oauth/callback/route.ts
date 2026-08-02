import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOAuthClient } from "@/lib/googleUserAuth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

// GET /api/admin/google-oauth/callback — Google redirects here after the
// user approves (or denies) the consent screen from /start.
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.json({ error: `Google denied the request: ${error}` }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  // Google only returns a refresh_token on the very first consent (or when
  // prompt=consent forces re-issue, which /start always sets) — without
  // one there's nothing to persist for future use, since access_tokens
  // alone expire in about an hour.
  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "No refresh token returned — this shouldn't happen since /start sets prompt=consent" },
      { status: 500 }
    );
  }

  await prisma.googleOAuthCredential.upsert({
    where: { id: 1 },
    update: { refreshToken: tokens.refresh_token, scope: tokens.scope ?? "" },
    create: { id: 1, refreshToken: tokens.refresh_token, scope: tokens.scope ?? "" },
  });

  return new NextResponse(
    "<p>Google account connected. You can close this tab.</p>",
    { headers: { "Content-Type": "text/html" } }
  );
}
