// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // redefinimos el negro y añadimos un token para fondo
        black: '#000000',
        background: {
          light: '#FFFFFF',
          dark:  '#000000',
        },
        link: {
          light: '#2563EB',
          dark:  '#3B82F6',
        }
      }
    },
  },
  plugins: [],
};
