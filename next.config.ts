import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
