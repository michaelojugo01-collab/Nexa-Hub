import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@nexa/api-contract', '@nexa/config', '@nexa/mocks', '@nexa/ui'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Mock images come from picsum (it redirects to fastly.picsum.photos). Add the real
    // CDN host here when the API is live.
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    // nexahub.app/@username → the profile page (the canonical URL keeps the @ form).
    return [{ source: '/@:username', destination: '/profile/:username' }];
  },
};

export default nextConfig;
