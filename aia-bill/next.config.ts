import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // assetPrefix only needed for the local dev reverse-proxy setup
  ...(isDev ? { assetPrefix: "/proxy/5660" } : {}),
  allowedDevOrigins: ["code.tryorate.cc", "localhost", "127.0.0.1", "107.181.134.56"],
  async rewrites() {
    if (!isDev) return [];
    return [
      {
        source: "/proxy/5660/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
