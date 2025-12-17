/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Merriweather'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        courtred: {
          700: "#8B0000",
          600: "#B3001B",
        },
      },
    },
  },
  plugins: [],
};


