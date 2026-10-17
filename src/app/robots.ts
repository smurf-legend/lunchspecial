import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // SEO-tool and China-only search crawlers: no visitors for this site, and
      // together they were ~18% of all requests (and database wake-ups).
      { userAgent: ["PetalBot", "AhrefsBot"], disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/kitchen/",
          "/profile",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/favorites",
          "/notifications",
          "/unsubscribed",
          "/my-specials",
          "/specials/*/edit",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
