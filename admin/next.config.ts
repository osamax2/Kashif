import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.kashifroad.com',
        pathname: '/api/reports/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '87.106.51.243',
        port: '8000',
        pathname: '/api/reports/uploads/**',
      },
    ],
  },
};

export default nextConfig;
