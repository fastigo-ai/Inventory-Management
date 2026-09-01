import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 100 * 1024 * 1024,
  },
  // turbopack: {
  //   root: '/Users/Apple/Desktop/Inventory-Management',
  // },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://seashell-app-r36uj.ondigitalocean.app'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
