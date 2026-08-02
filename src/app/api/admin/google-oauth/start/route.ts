import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOAuthClient, GOOGLE_OAUTH_SCOPES } from "@/lib/googleUserAuth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "admin") return null;
  return session;
}

// GET /api/admin/google-oauth/start — kicks off the one-time (or
// re-authorize-after-revoke) OAuth grant. Admin-only since this determines
// whose Google account Drive/Docs actions run as.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token, not just a short-lived access_token
    prompt: "consent", // forces Google to reissue a refresh_token even if this account already granted access before
    scope: GOOGLE_OAUTH_SCOPES,
  });

  return NextResponse.redirect(url);
}
