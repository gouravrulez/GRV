import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin-login", "/account", "/wishlist", "/api/"],
    },
    sitemap: "https://kaoma.in/sitemap.xml",
    host: "https://kaoma.in",
  };
}
