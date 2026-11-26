import type { NextConfig } from 'next';

const isDocker = process.env.DOCKER_BUILD === '1';

const nextConfig: NextConfig = {
  ...(isDocker && { output: 'standalone' as const }),
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
