/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        walnut: { 900: '#1f1409', 800: '#2b1c0e', 700: '#3a2714' },
        cream: { 50: '#fbf8f2', 100: '#f6f0e6', 200: '#ece2d1' },
        gold: { 400: '#d3b25e', 500: '#b8963e', 600: '#8a6d1f', 700: '#6b5214' },
        leaf: { 500: '#1b7a4b', 600: '#146239' },
        brick: { 500: '#b3342b' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
