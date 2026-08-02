import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Scopes requested by the one-time "Connect Google Account" flow. Drive
// (not the narrower drive.file) is needed because we're working with a
// folder the user created and shared themselves, not one created by this
// app — drive.file only covers files/folders the app itself created or the
// user explicitly picked via a Picker UI, neither of which applies here.
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
];

export function getOAuthClient() {
  // SITE_URL, not NEXTAUTH_URL — this must match the redirect URI actually
  // registered with Google exactly, which is always the production domain
  // (that's the only URI Google has on file for this Client ID). NEXTAUTH_URL
  // is localhost in local dev, which would silently break this flow there;
  // it's only ever meant to be run against production anyway, since Google
  // has no localhost URI to redirect back to.
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${SITE_URL}/api/admin/google-oauth/callback`
  );
}

// Authenticated client for Drive/Docs/Sheets calls that need to run as the
// real account owner (see the GoogleOAuthCredential model comment for why
// this exists alongside the service account used for Analytics/Search
// Console — those two are read-only and fine as a service account; this is
// for creating real files, which a service account can't do in a personal
// Drive folder).
export async function getUserOAuthClient() {
  const cred = await prisma.googleOAuthCredential.findUnique({ where: { id: 1 } });
  if (!cred) return null;

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: cred.refreshToken });
  return client;
}
