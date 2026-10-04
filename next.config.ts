import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: [
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/server-util',
    'html-encoding-sniffer',
    '@exodus/bytes',
    'jsdom',
  ],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
