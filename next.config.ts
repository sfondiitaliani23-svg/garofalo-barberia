import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/chi-siamo.html', destination: '/chi-siamo', permanent: true },
      { source: '/servizi.html', destination: '/servizi', permanent: true },
      { source: '/galleria.html', destination: '/galleria', permanent: true },
      { source: '/contatti.html', destination: '/contatti', permanent: true },
      { source: '/prenota.html', destination: '/prenota', permanent: true },
    ];
  },
};

export default nextConfig;