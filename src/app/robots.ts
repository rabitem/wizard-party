import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/deployment.config";

/**
 * Game rooms and the API are never indexed; neither are the tournament forms nor tournament links
 * with a query (private invite codes, "join your table" links). Public tournament pages are.
 */
const DISALLOWED = ["/lobby/*", "/game/*", "/results/*", "/api/*", "/tournaments/new", "/tournaments/*/edit", "/tournaments/*?"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: DISALLOWED,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
