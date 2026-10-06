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
  serverExternalPackages: ['@react-pdf/renderer', '@supabase/supabase-js', 'libphonenumber-js', 'bcryptjs', 'sharp'],
  transpilePackages: ['@ishoot/ui', '@ishoot/database', '@ishoot/locales', '@ishoot/email', '@ishoot/config'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@ishoot/ui'],
    // Enables forbidden(): pages a role may not open render app/forbidden.tsx with HTTP 403.
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
