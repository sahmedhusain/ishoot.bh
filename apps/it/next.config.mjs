import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// The IT dashboard loads nothing from other origins except the company fonts.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // same-origin, not no-referrer: with no-referrer a form posted before the page hydrates carries "Origin: null",
  // which server actions reject. Other sites still get no referrer.
  { key: "Referrer-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: [
    "@platform/ui",
    "@platform/locales",
    "@platform/config",
    "@platform/api-client",
    "@platform/contracts",
    "@platform/database",
  ],
  // Which service key this app signs its backend calls with (docs/adr/0011).
  env: { SERVICE_CALLER: "it" },
  experimental: {
    optimizePackageImports: ["lucide-react", "@platform/ui"],
    // forbidden(): pages an IT role may not open render app/forbidden.tsx with HTTP 403.
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
