import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: false,
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: [
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/server-util',
    '@blocknote/xl-pdf-exporter',
  ],
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
