/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,ts}',
    './node_modules/flowbite/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        amber: { glow: 'rgb(245 158 11 / 0.35)' },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'IBM Plex Sans Thai Looped', 'system-ui', 'sans-serif'],
        body: ['Inter', 'IBM Plex Sans Thai Looped', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [require('flowbite/plugin')],
};
