import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "unpkg.com" },
    ],
  },
  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {},
};

export default nextConfig;
