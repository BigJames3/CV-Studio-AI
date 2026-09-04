import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withSentryConfig } from '@sentry/nextjs';

const require = createRequire(import.meta.url);
const dir = path.dirname(fileURLToPath(import.meta.url));

function resolveReactQueryEntry() {
  try {
    const candidate = path.join(
      path.dirname(require.resolve('@tanstack/react-query/package.json')),
      'build/modern/index.js'
    );
    return existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

const reactQueryEntry = resolveReactQueryEntry();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(dir, '../..'),
  eslint: {
    dirs: ['src'],
  },
  transpilePackages: [
    '@tanstack/react-query',
    '@tanstack/query-core',
    '@tanstack/react-query-devtools',
    '@cvstudio/ui',
    '@cvstudio/shared-ui',
    '@cvstudio/shared-utils',
    '@cvstudio/shared-types',
  ],
  webpack: (config) => {
    if (reactQueryEntry) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tanstack/react-query': reactQueryEntry,
      };
    }
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.cvstudio.ai' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    instrumentationHook: true,
  },
  async headers() {
    const apiOrigin = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').origin;
      } catch {
        return 'http://localhost:3001';
      }
    })();
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      `connect-src 'self' ${apiOrigin} https://accounts.google.com https://oauth2.googleapis.com https://api.stripe.com https://*.sentry.io https://*.posthog.com https://us.i.posthog.com`,
      "frame-src https://accounts.google.com https://js.stripe.com https://hooks.stripe.com",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const sentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  sourcemaps: {
    disable: !sentryAuth,
  },
});
