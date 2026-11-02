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
  { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${[adminOrigin, ...(process.env.ADMIN_PREVIEW_ORIGINS || "").split(",").map(origin)].filter(Boolean).join(" ")}`.trim() },
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
  serverExternalPackages: ['libphonenumber-js'],
  transpilePackages: ['@platform/ui', '@platform/database', '@platform/locales', '@platform/email', '@platform/config', '@platform/api-client', '@platform/contracts'],
  // Which service key this app signs its backend calls with (docs/adr/0011).
  env: { SERVICE_CALLER: 'web' },
  experimental: {
    optimizePackageImports: ['lucide-react', '@platform/ui'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'assets.mixkit.co' },
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
