import { Resend } from "resend";
import { specialSlug } from "@/lib/slugify";
import type { DigestMode } from "@/lib/digest";

const FROM = "LunchSpecial <team@lunchspecial.com.au>";
const SITE_URL = "https://lunchspecial.com.au";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping password reset email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your LunchSpecial password",
    html: `
      <p>Someone requested a password reset for your LunchSpecial account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    console.error(`[mail] Failed to send password reset email to ${to}:`, error);
  }
}

type DigestSpecial = {
  id: string;
  title: string;
  venueName: string;
  specialPrice: number | null;
  discountPercent: number | null;
  chainWide: boolean;
  suburbs: { suburb: { name: string } }[];
};

const DIGEST_COPY: Record<DigestMode, { subject: string; intro: string }> = {
  friday: {
    subject: "Try these specials next week",
    intro:
      "Planning your week? Here are some lunch specials near you that you haven't tried yet.",
  },
  monday: {
    subject: "This week's top rated lunch specials",
    intro: "Didn't get a chance to plan ahead? Here are the best rated lunch specials near you.",
  },
};

export async function sendDigestEmail(
  to: string,
  { name, unsubscribeToken, mode, specials }:
    { name: string; unsubscribeToken: string; mode: DigestMode; specials: DigestSpecial[] }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping digest email");
    return false;
  }

  const { subject, intro } = DIGEST_COPY[mode];

  const itemsHtml = specials
    .map((s) => {
      const priceText =
        s.specialPrice != null
          ? `$${s.specialPrice.toFixed(2)}`
          : s.discountPercent != null
          ? `${s.discountPercent}% off`
          : "";
      const location = s.chainWide ? "All locations" : s.suburbs[0]?.suburb.name ?? "";
      const url = `${SITE_URL}/specials/${specialSlug(s)}`;
      return `
        <li style="margin-bottom:14px;list-style:none;">
          <a href="${url}" style="color:#ea580c;font-weight:bold;text-decoration:none;font-size:15px;">${s.title}</a><br/>
          <span style="color:#555;font-size:14px;">${s.venueName} — ${location}${priceText ? ` — ${priceText}` : ""}</span>
        </li>`;
    })
    .join("");

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <p>Hi ${name},</p>
      <p>${intro}</p>
      <ul style="padding:0;margin:20px 0;">${itemsHtml}</ul>
      <p><a href="${SITE_URL}" style="color:#ea580c;">Browse all lunch specials →</a></p>
      <p style="font-size:12px;color:#999;margin-top:32px;border-top:1px solid #eee;padding-top:12px;">
        You're getting this because you opted in to lunch deal emails.
        <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
      </p>
    `,
  });

  if (error) {
    console.error(`[mail] Failed to send digest email to ${to}:`, error);
    return false;
  }
  return true;
}
