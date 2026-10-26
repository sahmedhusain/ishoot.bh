import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: process.env.NEXT_DIST_DIR?.startsWith(".next-e2e") ? false : undefined,
  serverExternalPackages: ['@react-pdf/renderer', '@supabase/supabase-js', 'libphonenumber-js', 'bcryptjs', 'sharp'],
  transpilePackages: ['@platform/ui', '@platform/database', '@platform/locales', '@platform/email', '@platform/config'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@platform/ui'],
    // Enables forbidden(): pages a role may not open render app/forbidden.tsx with HTTP 403.
    authInterrupts: true,
    // The development-only Segment Explorer wraps each page in an extra node that the server and the browser do
    // not agree on, which shifts every useId under the page and logs hydration mismatches. Production is unaffected.
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
