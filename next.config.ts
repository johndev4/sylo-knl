import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    instantInsights: {
      validationLevel: 'warning',
    },
  },
};

export default nextConfig;
