import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const origin = (value) => {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
};
// The admin's live preview frames the website; nothing else may.
const adminOrigin = origin(process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL);
const securityHeaders = [
  { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${adminOrigin}`.trim() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];
// Customer and token pages must stay out of search results, and token links must not leak through referrers.
const privatePages = "cart|checkout|account|pay|track|unsubscribe";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: process.env.NEXT_DIST_DIR?.startsWith(".next-e2e") ? false : undefined,
  serverExternalPackages: ['@supabase/supabase-js', 'libphonenumber-js'],
  transpilePackages: ['@platform/ui', '@platform/database', '@platform/locales', '@platform/email', '@platform/config'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@platform/ui'],
    // The development-only Segment Explorer wraps pages in a node the server and the browser disagree on, which
    // logs hydration mismatches; production is unaffected.
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'assets.mixkit.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: `/:locale/:section(${privatePages})/:rest*`,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
