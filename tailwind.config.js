// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════════
        // BRAND COLORS - EINE STELLE ZUM ÄNDERN
        // Ändere diese Werte und die gesamte App ändert sich
        // ═══════════════════════════════════════════════════════════════
        brand: {
          DEFAULT: '#0d9488',      // bg-brand, text-brand (Blue-600)
          hover: '#0f766e',        // hover:bg-brand-hover (Blue-700)
          light: '#14b8a6',        // text-brand-light (Blue-500)
          muted: '#ccfbf1',        // bg-brand-muted (Blue-100)
          dark: '#115e59',         // text-brand-dark (Blue-800)
        },
        
        // Semantic Colors - NICHT ÄNDERN (universell verstanden)
        positive: {
          DEFAULT: '#16a34a',      // Green-600
          light: '#22c55e',        // Green-500
          muted: '#dcfce7',        // Green-100
        },
        negative: {
          DEFAULT: '#dc2626',      // Red-600
          light: '#ef4444',        // Red-500
          muted: '#fee2e2',        // Red-100
        },
        
        // ═══════════════════════════════════════════════════════════════
        // EXISTING COLORS - Deine bisherigen Farben
        // ═══════════════════════════════════════════════════════════════
        heroFrom: '#000000',
        heroTo: '#1f1f1f',
        accent: '#2563eb',         // ✅ Geändert von #00ff88 zu Brand Blue
        'surface-dark': '#1f1f1f',
        'card-dark': '#37383A',
        section1: '#0f131a',
        section2: '#161c26',
        section3: '#1d2430',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}