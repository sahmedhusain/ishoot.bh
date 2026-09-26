import type { Config } from 'tailwindcss';
import sharedConfig from '@ishoot/config';

const config: Config = {
  presets: [sharedConfig as any],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
