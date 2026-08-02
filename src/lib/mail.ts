import { Resend } from "resend";
import { specialSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";
import type { AnalyticsReport } from "@/lib/analyticsReport";

const FROM = "LunchSpecial <team@lunchspecial.com.au>";
// Where anonymous "suggest a special" tips get emailed for review — no admin
// UI notification system exists yet, so email is the simplest way to not
// miss one. Overridable via env without a code change if that ever needs to
// go somewhere else (a shared inbox, etc).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "clark.kent.480190@gmail.com";
// Where new-signup and new-special notifications go — the shared inbox the
// chef actually checks, distinct from ADMIN_EMAIL above (tip submissions).
const CHEF_EMAIL = process.env.CHEF_EMAIL || "chef@lunchspecial.com.au";

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

export async function sendNewSignupEmail(user: { name: string; email: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping new signup email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: CHEF_EMAIL,
    subject: "New LunchSpecial signup",
    html: `
      <p>A new user just signed up:</p>
      <p><strong>${user.name}</strong> — ${user.email}</p>
    `,
  });

  if (error) {
    console.error("[mail] Failed to send new signup email:", error);
  }
}

export async function sendNewSpecialEmail(special: {
  id: string;
  title: string;
  venueName: string;
  authorName: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping new special email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: CHEF_EMAIL,
    subject: "New special posted",
    html: `
      <p><strong>${special.venueName}</strong> — ${special.title}</p>
      <p>Posted by ${special.authorName}</p>
      <p><a href="${SITE_URL}/specials/${specialSlug(special)}" style="color:#ea580c;">View the special →</a></p>
    `,
  });

  if (error) {
    console.error("[mail] Failed to send new special email:", error);
  }
}

// Arrow + color for a percent-change trend — green/up for growth, red/down
// for decline, gray/dash when there's no previous-period baseline to
// compare against. `goodIsDown` flips the color (not the arrow direction)
// for metrics like average position where a smaller number is the win.
function trendHtml(changePct: number | null, opts: { goodIsDown?: boolean } = {}): string {
  if (changePct === null) return `<span style="color:#999;">—</span>`;
  const up = changePct >= 0;
  const good = opts.goodIsDown ? !up : up;
  const color = good ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  return `<span style="color:${color};">${arrow} ${Math.abs(changePct).toFixed(1)}%</span>`;
}

function deltaHtml(change: number | null, opts: { goodIsDown?: boolean; decimals?: number } = {}): string {
  if (change === null) return `<span style="color:#999;">—</span>`;
  const up = change >= 0;
  const good = opts.goodIsDown ? !up : up;
  const color = good ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  const decimals = opts.decimals ?? 0;
  return `<span style="color:${color};">${arrow} ${Math.abs(change).toFixed(decimals)}</span>`;
}

export async function sendAnalyticsDigestEmail(report: AnalyticsReport): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY is not set — skipping analytics digest email");
    return false;
  }

  const row = (label: string, value: string, trend: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#555;">${label}</td>
      <td style="padding:6px 12px;font-weight:bold;">${value}</td>
      <td style="padding:6px 0;">${trend}</td>
    </tr>`;

  // Order matches what's actually worth watching to make improvements
  // (decided after going through this explicitly): organic traffic and
  // suburb coverage first — the two things that most directly answer "is
  // SEO working" and "did we grow the thing we control" — then the
  // Search Console detail that explains *why*, general site health last.
  const headlineRows = [
    row("Organic search sessions", String(report.organicSessions.value), trendHtml(report.organicSessions.changePct)),
    row(
      "Suburbs with a live special",
      String(report.suburbsCovered.value),
      deltaHtml(report.suburbsCovered.change)
    ),
    row(
      "Search Console avg. position",
      report.avgPosition.value.toFixed(1),
      deltaHtml(report.avgPosition.change, { goodIsDown: true, decimals: 1 })
    ),
    row("Search Console clicks", String(report.searchClicks.value), trendHtml(report.searchClicks.changePct)),
    row(
      "Search Console impressions",
      String(report.searchImpressions.value),
      trendHtml(report.searchImpressions.changePct)
    ),
    row("Search Console CTR", `${report.avgCtr.value.toFixed(1)}%`, trendHtml(report.avgCtr.changePct)),
    row("Total sessions", String(report.totalSessions.value), trendHtml(report.totalSessions.changePct)),
    row("Active users", String(report.activeUsers.value), trendHtml(report.activeUsers.changePct)),
    row(
      "Engagement rate",
      `${report.engagementRate.value.toFixed(1)}%`,
      trendHtml(report.engagementRate.changePct)
    ),
  ].join("");

  const pagesHtml = report.topPages
    .map((p) => `<li>${p.path} — ${p.sessions} session${p.sessions === 1 ? "" : "s"}</li>`)
    .join("");
  const sourcesHtml = report.topSources
    .map((s) => `<li>${s.source} — ${s.sessions} session${s.sessions === 1 ? "" : "s"}</li>`)
    .join("");
  const queriesHtml = report.topQueries
    .map(
      (q) =>
        `<li>"${q.query}" — ${q.clicks} click${q.clicks === 1 ? "" : "s"}, ${q.impressions} impression${
          q.impressions === 1 ? "" : "s"
        }, avg position ${q.position.toFixed(1)}</li>`
    )
    .join("");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: "Weekly LunchSpecial analytics digest",
    html: `
      <p style="color:#999;font-size:12px;">vs. the previous 7 days</p>
      <table style="border-collapse:collapse;">${headlineRows}</table>

      <h3 style="margin-top:24px;">Top pages</h3>
      <ul style="padding-left:20px;">${pagesHtml || "<li>No data</li>"}</ul>

      <h3 style="margin-top:24px;">Top traffic sources</h3>
      <ul style="padding-left:20px;">${sourcesHtml || "<li>No data</li>"}</ul>

      <h3 style="margin-top:24px;">Top search queries (Search Console, ~3-day reporting lag)</h3>
      <ul style="padding-left:20px;">${queriesHtml || "<li>No data</li>"}</ul>
    `,
  });

  if (error) {
    console.error("[mail] Failed to send analytics digest email:", error);
    return false;
  }
  return true;
}
