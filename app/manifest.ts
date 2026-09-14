import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAOMA — Clothing & Intimate Wellness",
    short_name: "KAOMA",
    description: "Discreet, inclusive clothing, intimate wellness and gifting.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf2",
    theme_color: "#7b183d",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
