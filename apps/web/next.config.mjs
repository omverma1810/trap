/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Production optimizations
  poweredByHeader: false,  // Remove X-Powered-By header for security
  compress: true,          // Enable gzip compression

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    // Add your production domain when available
    // domains: ['api.yourdomain.com'],
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],  // Keep error and warn logs
    } : false,
  },

  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_APP_NAME: 'TRAP Inventory',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
