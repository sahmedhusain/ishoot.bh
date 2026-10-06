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
  transpilePackages: ['@ishoot/ui', '@ishoot/database', '@ishoot/locales', '@ishoot/email', '@ishoot/config'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@ishoot/ui'],
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
