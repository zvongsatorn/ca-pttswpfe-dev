import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
