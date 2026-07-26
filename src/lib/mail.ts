import { Resend } from "resend";
import { specialSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";

const FROM = "LunchSpecial <team@lunchspecial.com.au>";
// Where anonymous "suggest a special" tips get emailed for review — no admin
// UI notification system exists yet, so email is the simplest way to not
// miss one. Overridable via env without a code change if that ever needs to
// go somewhere else (a shared inbox, etc).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "clark.kent.480190@gmail.com";

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
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  chainWide: boolean;
  suburbs: { suburb: { name: string } }[];
};

export async function sendDigestEmail(
  to: string,
  { name, unsubscribeToken, subject, intro, specials }:
    { name: string; unsubscribeToken: string; subject: string; intro: string; specials: DigestSpecial[] }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping digest email");
    return false;
  }

  const itemsHtml = specials
    .map((s) => {
      const priceText =
        s.specialPrice != null
          ? `$${s.specialPrice.toFixed(2)}`
          : s.discountPercent != null
          ? `${s.discountPercent}% off`
          : s.priceRangeMin != null && s.priceRangeMax != null
          ? `$${s.priceRangeMin.toFixed(2)}–$${s.priceRangeMax.toFixed(2)}`
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

export async function sendTipSubmissionEmail(details: string, link: string | null, imageUrl: string | null) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping tip submission email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: "New special tip submitted",
    html: `
      <p>Someone sent in a special without posting it themselves:</p>
      <p style="white-space:pre-line;background:#f7f7f7;padding:12px;border-radius:6px;">${details}</p>
      ${link ? `<p>Link: <a href="${link}">${link}</a></p>` : ""}
      ${imageUrl ? `<p><img src="${imageUrl}" style="max-width:400px;border-radius:6px;" /></p>` : ""}
      <p><a href="${SITE_URL}/kitchen/submissions" style="color:#ea580c;">Review in the kitchen →</a></p>
    `,
  });

  if (error) {
    console.error("[mail] Failed to send tip submission email:", error);
  }
}
