import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["152.53.148.128", "localhost", "127.0.0.1"],
	async redirects() {
		return [
			{
				source: "/billing",
				destination: "/dashboard/billing",
				permanent: true,
			},
			{
				source: "/billing/:path*",
				destination: "/dashboard/billing/:path*",
				permanent: true,
			},
		];
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "2mb",
		},
	},
};

export default nextConfig;
