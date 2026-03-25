/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#020617',
          card: '#0F172A',
          elevated: '#1E293B',
        },
        brand: {
          DEFAULT: '#22C55E',
          light: '#4ADE80',
          muted: 'rgba(34,197,94,0.15)',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#475569',
        },
        positive: '#22C55E',
        negative: '#EF4444',
      },
    },
  },
  plugins: [],
};
