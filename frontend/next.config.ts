import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
