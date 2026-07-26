import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
