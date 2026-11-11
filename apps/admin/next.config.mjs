import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: process.env.NEXT_DIST_DIR?.startsWith(".next-e2e") ? false : undefined,
  serverExternalPackages: ['@react-pdf/renderer', 'libphonenumber-js', 'bcryptjs', 'sharp'],
  transpilePackages: [],
  env: { SERVICE_CALLER: 'admin' },
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
