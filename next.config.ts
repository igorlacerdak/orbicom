import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  productionBrowserSourceMaps: true,
};

export default nextConfig;
