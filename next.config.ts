import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800,
    remotePatterns: [{protocol:"https",hostname:"iapzfecqnzxrpmhlhyuz.supabase.co",pathname:"/storage/v1/object/public/product-images/**"}],
  },
};

export default nextConfig;
