/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8e8ff',
          200: '#b7d5ff',
          300: '#8cb1ff',
          400: '#5c82ff',
          500: '#3366ff',
          600: '#2f57db',
          700: '#2645a7',
          800: '#203a86',
          900: '#1a3169',
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}

