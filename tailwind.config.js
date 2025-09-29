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
          heroFrom: '#000000',
          heroTo:   '#1f1f1f',
          accent:   '#00ff88',
          'surface-dark':'#1f1f1f',
          'card-dark':   '#37383A',
          section1: '#0f131a',   // etwas dunkleres Schwarzblau
        section2: '#161c26',   // leicht helleres Schwarzblau
        section3: '#1d2430',   // noch heller
        },
        fontFamily: {
          sans:    ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
          orbitron:['Orbitron','sans-serif'],
        },
      },
    },
    plugins: [],
  }