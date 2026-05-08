/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: '#ff2bd6',
          cyan: '#22d3ee',
          violet: '#8b5cf6',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(139, 92, 246, 0.45)',
      },
    },
  },
  plugins: [],
};
