/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#1D6AE5',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      }
    },
  },
  plugins: [],
}

