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
const webOrigin = origin(process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL);
// Report-only until a clean run in production; frame-ancestors is enforced separately below.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  `frame-src 'self' blob: ${webOrigin}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: process.env.NEXT_DIST_DIR?.startsWith(".next-e2e") ? false : undefined,
  serverExternalPackages: ['@react-pdf/renderer', 'libphonenumber-js', 'bcryptjs', 'sharp'],
  transpilePackages: [],
  // Which service key this app signs its backend calls with (docs/adr/0011).
  env: { SERVICE_CALLER: 'admin' },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Enables forbidden(): pages a role may not open render app/forbidden.tsx with HTTP 403.
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
