/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
          800: "#1e40af", 900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
      fontSize: {
        'xs':   ['0.8125rem', { lineHeight: '1.15rem' }],
        'sm':   ['0.9375rem', { lineHeight: '1.35rem' }],
        'base': ['1.0625rem', { lineHeight: '1.55rem' }],
        'lg':   ['1.1875rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.3125rem', { lineHeight: '1.85rem' }],
        '2xl':  ['1.625rem',  { lineHeight: '2rem' }],
        '3xl':  ['1.9375rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
      },
    },
  },
  plugins: [],
};
