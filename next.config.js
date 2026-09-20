/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  allowedDevOrigins: ['http://192.168.29.137:3000', 'http://localhost:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://i.pravatar.cc https://*.googleapis.com https://*.firebaseio.com https://firebasestorage.googleapis.com",
              "font-src 'self'",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.appspot.com https://firebasestorage.googleapis.com https://fcm.googleapis.com wss://*.firebaseio.com http://localhost:*",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
