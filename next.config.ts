import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow backend API calls from server-side
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
