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
};

export default nextConfig;
