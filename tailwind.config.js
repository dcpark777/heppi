/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'christmas-red': '#f00',
        'christmas-gold': '#f5e0a3',
      },
    },
  },
  plugins: [],
}

