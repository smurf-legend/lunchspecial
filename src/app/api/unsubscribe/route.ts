import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/unsubscribe?token=... — one-click unsubscribe from marketing
// emails, no login required. Every marketing email links here with the
// recipient's unsubscribeToken.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    const user = await prisma.user.findUnique({ where: { unsubscribeToken: token } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { marketingOptIn: false } });
    }
  }
  return NextResponse.redirect(new URL("/unsubscribed", req.url));
}
