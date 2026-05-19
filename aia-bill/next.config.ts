import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/proxy/5660",
  allowedDevOrigins: ["code.tryorate.cc", "localhost", "127.0.0.1", "107.181.134.56"],
  async rewrites() {
    return [
      // Makes /proxy/5660/_next/... and /proxy/5660/<page> work when accessed directly
      // (without going through the reverse proxy)
      {
        source: "/proxy/5660/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
