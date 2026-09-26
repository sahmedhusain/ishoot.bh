import type { Config } from 'tailwindcss';

const config: Omit<Config, 'content'> = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Official ishoot brand colors from brand guidelines
        primary: {
          DEFAULT: '#014842', // Deep Emerald / Forest Pine
          light: '#02665D',
          dark: '#002D29',
        },
        accent: {
          DEFAULT: '#09937F', // Radiant Jade / Persian Teal
          hover: '#0BB49B',
          glow: 'rgba(9, 147, 127, 0.35)',
        },
        // Obsidian dark surfaces
        bg: {
          base: '#050807',      // Deepest cinematic black
          surface: '#0B1210',   // Card & modal surfaces
          elevated: '#111C19',  // Dropdowns & active elements
        },
        // Borders
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          emerald: 'rgba(9, 147, 127, 0.20)',
          active: '#09937F',
        },
        // Typography
        text: {
          primary: '#F2F6F5',   // Soft silver-white
          secondary: '#9EADA9', // Muted caption grey
          accent: '#09937F',
        },
      },
      fontFamily: {
        display: ['Virtual', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shutter': 'shutter 3s ease-in-out infinite',
        'marquee': 'marquee 25s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        shutter: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        glass: '24px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
